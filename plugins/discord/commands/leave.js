module.exports = function(client, message, args) {
  let user = message.guild.members.cache.get(message.author.id)
  let found = false
  client.voice.connections.forEach(con => {
    if(!found && con.channel.guild === message.guild)
      found = true
      client.mediaPlayer.connection = undefined;
      client.mediaPlayer.queue = [];
      client.mediaPlayer.now_playing = ''
      con.disconnect()
  })
}
