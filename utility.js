class Utility {
  static toHex(text) {
    const newString = [];
    for (let i = 0; i < text.length; i++) {
      newString.push(text[i].toString(16));
    }
    return newString.join('').toUpperCase();
  }

  static toString(bytes) {
    const newString = [];
    for (let i = 0; i < bytes.length; i++) {
      newString.push(String.fromCharCode(bytes[i]));
    }
    return newString.join('');
  }
}
