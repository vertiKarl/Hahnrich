module.exports = function(client, message, args) {
  const mediaPlayer = client[message.guild.id]
  mediaPlayer.queue = []
  mediaPlayer.next()
}
