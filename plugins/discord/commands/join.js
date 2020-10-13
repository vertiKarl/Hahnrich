module.exports = function(client, message, args) {
  let user = message.guild.members.cache.get(message.author.id)
  return user.voice.channel.join()
}
