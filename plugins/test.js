require('../MessageHandler.js');

process.on('message', (msg) => {
  // handle messages from parent
})

console.log("test")

setTimeout(() => {
  throw new Error()
}, 3000)
