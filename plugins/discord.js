require('../MessageHandler.js');
const discord = require('discord.js');
const client = new discord.Client();
const dhl = require('postman-request');
const F = require('fs');
let lastDL;
const meta = require('music-metadata')

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
  client.mediaPlayer = {
    now_playing: "",
    queue: [],
    connection: undefined,
    currentLength: undefined,
    leaveTimer: undefined,
    next: function() {
      if(this.leaveTimer) {
        clearTimeout(this.leaveTimer)
      }
      if(!this.repeat) {
        if(this.queue.length > 0) {
          this.now_playing = this.queue[0]
          meta.parseFile(__dirname + "/discord/songs/" + this.now_playing).then((data) => {
                  length = {
                    total: parseInt(data.format.duration),
                    after: parseInt(data.format.duration),
                    minutes: 0,
                    seconds: 0
                  }
                  length.minutes = Math.floor(length.after / 60)
                  length.after = Math.floor(length.after - (length.minutes * 60) )
                  length.seconds = length.after
                  if(length.seconds > 10) {
                    lengthformat = `${length.minutes}:${length.seconds}`
                  } else {
                    lengthformat = `${length.minutes}:0${length.seconds}`
                  }
                  this.currentLength = lengthformat
                })
          this.queue.splice(0, 1)
          if(typeof this.connection !== "undefined") {
            const dispatcher = this.connection.play(__dirname + "/discord/songs/" + this.now_playing)
            dispatcher.on('finish', () => {
              client.mediaPlayer.next()
            })
          }
        } else {
          this.now_playing = ""
          this.leaveTimer = setTimeout(() => {
            this.connection.disconnect()
          }, 20 /*Minutes*/ * 60 /*Seconds*/ * 1000 /*Milliseconds*/)
          // nothing to play
        }
      } else {
        // play again
        if(typeof this.connection !== "undefined") {
          const dispatcher = this.connection.play(__dirname + "/discord/songs/" + this.now_playing)
          dispatcher.on('finish', () => {
            client.mediaPlayer.next()
          })
        }
      }
    },
    skip: function() {
      this.repeat = false
      this.next()
    },
    shuffle: function() {
      let currentIndex = this.queue.length, temporaryValue, randomIndex;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = this.queue[currentIndex];
        this.queue[currentIndex] = this.queue[randomIndex];
        this.queue[randomIndex] = temporaryValue;
      }
    },
    repeat: false
  }
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
        message.reply(arr.join(', '))
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
