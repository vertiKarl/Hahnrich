module.exports = function(client, message, args) {
    const mediaPlayer = client[message.guild.id]
    mediaPlayer.repeat = !mediaPlayer.repeat
    message.reply("Repeating turned " + !mediaPlayer.repeat ? "off" : "on")
}
