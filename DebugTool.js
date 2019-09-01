class DebugTool {
  static write(message) {
    const output = document.querySelector('#output');
    output.innerHTML = output.innerHTML + "<p>" + message + "</p>";
  }
}
