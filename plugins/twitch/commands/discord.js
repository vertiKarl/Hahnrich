module.exports = function(twitch, chat, pubAPI, channel, user, args) {
  if(channel === '#snaq__') {
    chat.action(channel, `Raid-Discord: https://discord.gg/vuZeStp`)
  } else {
    chat.action(channel, `Ahoy @${user}, https://discord.gg/qew4dba`)
  }
}
