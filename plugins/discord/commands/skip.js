module.exports = function(client, message, args) {
  const mediaPlayer = client[message.guild.id]
  // check if user entered amount of skipped songs
  if(!Number.isNaN(parseInt(args[0])) && parseInt(args[0] > 0)) {
    args[0] = parseInt(args[0])
  } else {
    // otherwise set it to 1
    args[0] = 1
  }
  for(let i = 0; i < args[0]; i++) {
    mediaPlayer.skip()
  }
}
