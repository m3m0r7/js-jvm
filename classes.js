const classes = {
  'java.lang.System': class {
    constructor() {
      this.out = new classes['java.io.PrintStream']()
    }
  },
  'java.io.PrintStream': class {
    println = (...args) => {
      document.querySelector('#output').append(
        (new TextDecoder()).decode(Uint8Array.from(args[0].bytes))
      );
    }
  }
};
