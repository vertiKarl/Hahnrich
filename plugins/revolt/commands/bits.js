module.exports = function(client, message, args) {
  const mediaPlayer = client[message.guild.id]
  require('./play.js')(client, message, ["https://www.youtube.com/watch?v=lK1RFA3Xl5M", "force"])
}
