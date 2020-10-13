module.exports = function(twitch, chat, pubAPI, channel, user, args) {
  if(channel === '#snaq__') {
    chat.action(channel, 'https://pastebin.com/raw/ELWMpuTV')
  } else {
    chat.action(channel, 'this channel does not provide any settings.')
  }
}
