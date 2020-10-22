const F = require('fs')
module.exports = function(client, message, args) {
  const mediaPlayer = client[message.guild.id]
  // check if user entered amount of random songs
  if(!Number.isNaN(parseInt(args[0]))) {
    args[0] = parseInt(args[0])
  } else {
    // otherwise set it to 5
    args[0] = 5
  }
  // load songs
  const songs = F.readdirSync(__dirname + "/../songs")
  // select random songs and push them to the queue
  for(let i = 0; i < args[0]; i++) {
    mediaPlayer.queue.push(songs[Math.floor(Math.random() * songs.length)])
  }
  // connect to channel if not done yet
  if(!mediaPlayer.connection) {
    require('./join.js')(client, message, args)
    .then((con) => {
      mediaPlayer.connection = con
      mediaPlayer.next()
    })
    .catch((err) => {
      console.log(err)
      message.reply('failed joining')
    })
  } else if(mediaPlayer.now_playing === '') {
    mediaPlayer.next()
  }
}
