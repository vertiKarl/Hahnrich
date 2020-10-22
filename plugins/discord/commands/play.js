const F = require('fs')
module.exports = function(client, message, args) {
  const mediaPlayer = client[message.guild.id]
  if(args[0] && (args[0].startsWith('https://youtube.com/watch') || args[0].startsWith('https://www.youtube.com/watch'))) {
    mediaPlayer.queue.push(args[0]);
    // connect to channel if not done yet
    if(!mediaPlayer.connection) {
      require('./join.js')(client, message, args)
      .then((con) => {
        mediaPlayer.connection = con
        mediaPlayer.next()
      })
      .catch((err) => {
        console.log("error:", err)
        message.reply('failed joining')
      })
    }
  } else {

  }
}
