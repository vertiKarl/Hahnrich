const discord = require('discord.js')
module.exports = function(client, message, args) {
  if(client.mediaPlayer.connection && client.mediaPlayer.connection.dispatcher) {
    let streamtimeformat
    length = {
      total: parseInt((client.mediaPlayer.connection.dispatcher.streamTime/1000).toFixed(0)),
      after: parseInt((client.mediaPlayer.connection.dispatcher.streamTime/1000).toFixed(0)),
      minutes: 0,
      seconds: 0
    }
    length.minutes = Math.floor(length.after / 60)
    length.after = Math.floor(length.after - (length.minutes * 60) )
    length.seconds = length.after
    if(length.seconds > 10) {
      streamtimeformat = `${length.minutes}:${length.seconds}`
    } else {
      streamtimeformat = `${length.minutes}:0${length.seconds}`
    }
  } else {
    streamtimeformat = "0:00"
  }
  let embed = new discord.MessageEmbed()
  .setColor('#d10202')
  .setTitle('Now Playing:')
  .setURL('https://zap-hosting.com/de/shop/donation/b46e5e7b07106dad59febaf3b66fd5e5/')
  .setAuthor('HahnrichJS', 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/cb/cb9a41873f2065b8010afa7584803d283dd7e6ad_full.jpg', 'https://alleshusos.de')
  .addField(`${client.mediaPlayer.now_playing !== '' ? client.mediaPlayer.now_playing : "not playing anything"}`, `${streamtimeformat}/${typeof client.mediaPlayer.currentLength !== "undefined" ? client.mediaPlayer.currentLength : "0:00"}`)
  .setFooter(`Queue:\n${client.mediaPlayer.queue.join('\n')}`)
  message.reply(embed)
  //message.reply(client.mediaPlayer.now_playing + "\nQueue: \n" + client.mediaPlayer.queue.join('\n'))
}
