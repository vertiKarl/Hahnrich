module.exports = function(client, message, args) {
  let user = message.guild.members.cache.get(message.author.id)
  let found = false
  client.voice.connections.forEach(con => {
    if(!found && con.channel.guild === message.guild)
      found = true
      client[message.guild.id].connection = undefined;
      client[message.guild.id].queue = [];
      client[message.guild.id].now_playing = '';
      con.disconnect()
  })
}
