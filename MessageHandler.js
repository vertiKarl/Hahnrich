console.log = function() {
  let args = '';
  for(let i = 0; i < arguments.length; i++) {
    args += arguments[i];
    if(i !== arguments.length) {
      args += ' ';
    }
  }
  process.send(args)
}
