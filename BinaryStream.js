class BinaryStream {
  constructor(source) {
    this.source = source;
    this.pointer = 0;
  }


  read(length = 1) {
    const bytes = this.source.slice(this.pointer, this.pointer + length);
    this.pointer += length;
    return bytes;
  }

  readUnsignedShort() {
    const bytes = this.read(2);
    return bytes[0] << 8
      | bytes[1];
  }

  readUnsignedInt() {
    const bytes = this.read(4);
    return bytes[0] << 24
      | bytes[1] << 16
      | bytes[2] << 8
      | bytes[3];
  }

}
