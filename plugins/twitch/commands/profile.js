module.exports = function(twitch, chat, pubAPI, channel, user, args) {
  chat.timeout(channel, user, 100, "https://alleshusos.de/timeout ").then(() => {
    client.action(channel, `${user[display-name]} if you are curious on why you got timed out -> https://alleshusos.de/timeout`)
  }).catch((e) => {
    console.log(e)
  })
}
