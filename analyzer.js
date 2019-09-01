class Analyzer {
  constructor(source, $document) {
    this.source = source;
    this.$document = $document;

    // initialize
    this.methods = [];
    this.attributes = [];

    // skip first
    this.cp = [undefined];
    this.stream = new BinaryStream(this.source);
  }

  analyze() {
    DebugTool.write(`Start analyzing class`);

    // Read CAFEBABE
    const magicbyte = Utility.toHex(this.stream.read(4));
    if (magicbyte !== "CAFEBABE") {
      throw new Error('Invalid magicbyte.');
    }

    // Read minor version
    const minorVersion = this.stream.readUnsignedShort();

    DebugTool.write(`Minor Version ${minorVersion}`);

    // Read major version
    const majorVersion = this.stream.readUnsignedShort();

    DebugTool.write(`Minor Version ${majorVersion}`);

    // Read constant pool
    const cpCount = this.stream.readUnsignedShort();

    for (let i = 1; i < cpCount; i++) {
      const tag = this.stream.read(1)[0];
      DebugTool.write(`Read constant pool Tag ${tag}`);

      switch (tag) {
        case 0x07: // CONSTANT_Class
          this.cp.push({
            tag,
            nameIndex: this.stream.readUnsignedShort(),
          });
          break;
        case 0x09: // CONSTANT_Fieldref
        case 0x0A: // CONSTANT_Methodref
          this.cp.push({
            tag,
            classIndex: this.stream.readUnsignedShort(),
            nameAndTypeIndex: this.stream.readUnsignedShort(),
          });
          break;
        case 0x08: // CONSTANT_String
          this.cp.push({
            tag,
            stringIndex: this.stream.readUnsignedShort(),
          });
          break;
        case 0x0C: // CONSTANT_NameAndType
          this.cp.push({
            tag,
            nameIndex: this.stream.readUnsignedShort(),
            descriptorIndex: this.stream.readUnsignedShort(),
          });
          break;
        case 0x01: // CONSTANT_Utf8
          const utf8Obj = {
            tag,
            length: this.stream.readUnsignedShort(),
          };

          utf8Obj.bytes = this.stream.read(utf8Obj.length);
          utf8Obj.text = Utility.toString(utf8Obj.bytes);
          this.cp.push(utf8Obj);
          break;
        default:
          throw new Error('Unknown Constant tag. ' + tag);
      }
    }


    const accessFlags = this.stream.readUnsignedShort();
    DebugTool.write(`Access flags ${accessFlags}`);

    const thisClass = this.stream.readUnsignedShort();
    const superClass = this.stream.readUnsignedShort();

    const interfaceCount = this.stream.readUnsignedShort();
    DebugTool.write(`Interfaces: ${interfaceCount}`);

    for (let i = 0; i < interfaceCount; i++) {
      // Nothing to do...
    }

    const fieldsCount = this.stream.readUnsignedShort();
    DebugTool.write(`Fields: ${fieldsCount}`);

    for (let i = 0; i < fieldsCount; i++) {
      // Nothing to do...
    }

    const methodsCount = this.stream.readUnsignedShort();
    DebugTool.write(`Methods: ${methodsCount}`);

    for (let i = 0; i < methodsCount; i++) {
      const obj = {
        accessFlags: this.stream.readUnsignedShort(),
        nameIndex: this.stream.readUnsignedShort(),
        descriptorIndex: this.stream.readUnsignedShort(),
        attributesCount: this.stream.readUnsignedShort(),
        attributes: [],
      };

      for (let j = 0; j < obj.attributesCount; j++) {
        obj.attributes.push(this.analyzeAttribute());
      }

      this.methods.push(obj);
    }

    const attributesCount = this.stream.readUnsignedShort();
    DebugTool.write(`Attribute: ${attributesCount}`);

    for (let i = 0; i < attributesCount; i++) {
      this.attributes.push(this.analyzeAttribute())
    }

    return this;
  }

  analyzeAttribute() {
    const attributeNameIndex = this.stream.readUnsignedShort();
    const attributeLength = this.stream.readUnsignedInt();

    return {
      attributeNameIndex,
      attributeLength,
      payload: this.stream.read(attributeLength)
    };
  }

  call(methodName, ...args) {
    for (const method of this.methods) {
      if (this.cp[method.nameIndex].text !== methodName) {
        continue;
      }

      DebugTool.write(`Call ${methodName}`);

      // Find attribute
      for (const attribute of method.attributes) {
        if (this.cp[attribute.attributeNameIndex].text !== 'Code') {
          continue;
        }

        const stream = new BinaryStream(attribute.payload);

        // Parse
        const maxStack = stream.readUnsignedShort();
        const maxLocals = stream.readUnsignedShort();
        const codeLength = stream.readUnsignedInt();
        const code = stream.read(codeLength);

        const exceptionTableLength = stream.readUnsignedShort();

        for (let i = 0; i < exceptionTableLength; i++) {
          // Nothing to do...
        }

        const attributesCount = stream.readUnsignedShort();
        const attributes = [];
        for (let i = 0 ; i < attributesCount; i++) {
          attributes.push(this.analyzeAttribute());
        }

        const operandStack = [];
        this.exec(
          new BinaryStream(code),
          operandStack
        );
      }
    }
  }

  exec(stream, operandStack) {
    while (true) {
      const opcode = stream.read(1)[0];
      let operand = null;

      DebugTool.write(`  Opcode 0x${Utility.toHex([opcode])}`);
      switch (opcode) {
        case 0xB2: // getstatic
          operand = stream.readUnsignedShort();
          operandStack.push(this.cp[operand]);
          break;
        case 0x12: // ldc
          operand = stream.read(1)[0];
          operandStack.push(this.cp[this.cp[operand].stringIndex]);
          break;
        case 0xB6: // invokevirtual
          const cpInfo = this.cp[stream.readUnsignedShort()];
          const nameAndType = this.cp[cpInfo.nameAndTypeIndex];

          const methodName = this.cp[nameAndType.nameIndex].text;
          const descriptor = this.cp[nameAndType.descriptorIndex].text;

          const methodArguments = [];
          for (let i = 0; i < descriptor.split(';').length - 1; i++) {
            methodArguments.push(operandStack.pop());
          }

          const context = operandStack.pop();
          const baseClass = this.cp[this.cp[context.classIndex].nameIndex].text;
          const baseClassTarget = this.cp[this.cp[context.nameAndTypeIndex].nameIndex].text;

          const classPath = baseClass.replace(/\//g, '.');
          const initiatedClass = new classes[classPath];

          initiatedClass[baseClassTarget][methodName](...methodArguments);
          break;
        case 0xB1: // return
          return;
        default:
          throw new Error('Unknown opcode: ' + Utility.toHex([opcode]));
      }
    }
  }
}
