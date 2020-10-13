const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

console.log = function() {
  let args = '';
  for(let i = 0; i < arguments.length; i++) {
    if(typeof arguments[i] === "object") {
      arguments[i] = JSON.stringify(arguments[i], getCircularReplacer())
    }
    args += arguments[i];
    if(i !== arguments.length) {
      args += ' ';
    }
  }
  process.send(args)
}
