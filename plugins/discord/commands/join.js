module.exports = function(client, message, args) {
  let user = message.guild.members.cache.get(message.author.id)
  client[message.guild.id].connection = user.voice.channel.join();
  return client[message.guild.id].connection;
}
