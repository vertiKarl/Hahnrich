module.exports = function(client, message, args) {
  client.mediaPlayer.queue = []
  client.mediaPlayer.next()
}
