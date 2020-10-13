module.exports = function(client, message, args) {
    client.mediaPlayer.repeat = !client.mediaPlayer.repeat
    message.reply("Repeating turned " + client.mediaPlayer.repeat ? "on" : "off")
}
