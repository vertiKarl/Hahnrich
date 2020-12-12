require('../MessageHandler.js');
const discord = require('discord.js');
const client = new discord.Client();
const dhl = require('postman-request');
const F = require('fs');
let lastDL;
const ytdl = require('ytdl-core')
const MediaPlayer = require('./discord/MediaPlayer.js');

process.on('message', (msg) => {
  lastDL.reply(msg.join(' '))
})

// load config
function loadConfig(og=false) {
  let cfg = JSON.parse(F.readFileSync('config.json'));
  if(!cfg.pluginSettings.discord) {
    cfg.pluginSettings.discord = {
      token: ""
    }
    F.writeFileSync('config.json', JSON.stringify(cfg, null, 4))
    return og ? cfg : cfg.pluginSettings.discord;
  } else {
    return og ? cfg : cfg.pluginSettings.discord;
  }
}
let config = loadConfig();

function writeConfig(settings) {
  const config = loadConfig(true)
  config.pluginSettings.discord = settings
  F.writeFileSync('config.json', JSON.stringify(config, null, 4))
}

function getCommands() {
  const files = F.readdirSync('./plugins/discord/commands').filter(file => file.endsWith('.js'))
  let c = new Map()
  for(const file of files) {
    c.set(file.replace('.js', ''), (require("./discord/commands/"+file)));
  }
  return c
}
let commands = getCommands()

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
        activity: {
          name: `Version ${require('../package.json').version}`,
          type: "STREAMING",
          url: 'https://twitch.tv/vertiKarl'
        },
        status: 'online'
      })
  client.guilds.cache.each((guild) => {
    client[guild.id] = new MediaPlayer()
  })
})

client.on('message', message => {
  if(message.channel['type'] !== 'dm') {
    if(message.attachments.first()) {
      message.attachments.each(file => {
        console.log(file)
        if(file.name.endsWith('.mp3')) {
          dhl.get(message.attachments.first().url)
          .on('error', (err) => {
            message.reply(err)
          })
          .pipe(F.createWriteStream(__dirname + "/discord/songs/" + file.name))
            .on('finish', () => {
              client.mediaPlayer.queue.push(file.name)
              if(client.mediaPlayer.connection) {
                if(!client.mediaPlayer.now_playing || client.mediaPlayer.now_playing === '') {
                  client.mediaPlayer.next()
                }
              } else {
                require('./discord/commands/join.js')(client, message, [])
                .then((con) => {
                  client.mediaPlayer.connection = con
                })
                .catch((err) => {
                  message.reply(err)
                })
              }
            })
        }
      })
    } else if(message.content[0] === "!") {
      let msg = message.content.split(' ')
      let cmd = msg[0].replace("!", "").toLowerCase()
      let args = msg
      args.splice(0, 1)
      if(commands.get(cmd)) {
        if(cmd === "s") {
          lastDL = message
        }
        commands.get(cmd)(client, message, args)
      } else if(cmd === "help") {
        let arr = Array.from(commands.keys())
        let help = JSON.parse(F.readFileSync("./plugins/discord/commands.json"))
        let embed = new discord.MessageEmbed()
        .setColor('#d10202')
        .setTitle('List of commands:')
        .setURL('https://zap-hosting.com/de/shop/donation/b46e5e7b07106dad59febaf3b66fd5e5/')
        .setAuthor('Hahnrich', 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/cb/cb9a41873f2065b8010afa7584803d283dd7e6ad_full.jpg', 'https://alleshusos.de')
        for(let c of Object.keys(help)) {
          embed.addField(c, `${help[c]}`, true);
        }
        message.reply(embed)
      } else if(cmd === "reload") {
        commands = getCommands()
        message.reply("Commands reloaded!")
      } else {
        // no command found
      }
    }
  }
})

client.login(config.token);
