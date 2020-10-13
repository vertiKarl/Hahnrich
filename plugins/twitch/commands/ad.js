module.exports = function(twitch, chat, pubAPI, channel, user, args) {
  pubAPI.kraken.channels.startChannelCommercial(channel, 60)
    .then(() => {
     chat.action(channel, "successfully ran ad")
    })
    .catch((err) => {
     chat.action(channel, "error playing ad")
     console.log(err)
    })
}
