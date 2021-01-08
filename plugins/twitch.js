require('../MessageHandler.js');
const { ApiClient } = require('twitch');
const { AccessToken, RefreshableAuthProvider, StaticAuthProvider, ClientCredentialsAuthProvider } = require('twitch-auth');
const { ChatClient } = require('twitch-chat-client');
const { PubSubClient } = require('twitch-pubsub-client');
const F = require('fs');
const dhl = require('postman-request');
const express = require('express');
const app = express();
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
  origin: "https://alleshusos.de",
  optionsSuccessStatus: 200
}))

process.on('message', (msg) => {
  // handle messages from parent
  msg = JSON.parse(msg[0])
  for(let i = 0; i < msg.length; i++) {
    if(msg[i].includes("https://clips.twitch.tv/")) {
      let id = msg[i].replace('https://clips.twitch.tv/', '');
      twitch.helix.clips.getClipById(id)
      .then((clip) => {
        let link = clip.thumbnailUrl.split('-preview')[0]+'.mp4'
        dhl.get(link).pipe(F.createWriteStream(`./plugins/discord/clips/${clip.id}.mp4`)).on('finish', () => {
                  F.writeFileSync(`./plugins/discord/clips/${clip.id}.json`, JSON.stringify(clip, null, 4))
                  console.log("discordDL", `Successfully downloaded clip "${clip.title}" from channel ${clip.broadcasterDisplayName}.\nYou can find it here: https://alleshusos.de/clips/${clip.id}.mp4`)
                })
      })
      .catch((err) => {
        console.error(':(', err)
      })
    }
  }
  console.log(msg.length)
})

// load config
function loadConfig(og=false) {
  let cfg = JSON.parse(F.readFileSync('config.json'));
  if(!cfg.pluginSettings.twitch) {
    cfg.pluginSettings.twitch = {
      clientID: "",
      accessToken: "",
      clientSecret: "",
      refreshToken: "",
      MclientID: "",
      MclientSecret: "",
      channels: [],
      key: ""
    }
    F.writeFileSync('config.json', JSON.stringify(cfg, null, 4))
    return og ? cfg : cfg.pluginSettings.twitch;
  } else {
    return og ? cfg : cfg.pluginSettings.twitch;
  }
}
let config = loadConfig();

function writeConfig(settings) {
  const config = loadConfig(true)
  config.pluginSettings.twitch = settings
  F.writeFileSync('config.json', JSON.stringify(config, null, 4))
}

function getCommands() {
  const files = F.readdirSync('./plugins/twitch/commands').filter(file => file.endsWith('.js'))
  let c = new Map()
  for(const file of files) {
    c.set(file.replace('.js', ''), (require("./twitch/commands/"+file)));
  }
  return c
}
let commands = getCommands()

// set up token refresh
const mainProvider = new RefreshableAuthProvider(
  new StaticAuthProvider(config.clientID, config.accessToken),
  {
    clientSecret: config.clientSecret,
    refreshToken: config.refreshToken,
    onRefresh: (obj) => {
      obj = obj._data
      config.accessToken = obj.access_token
      config.refreshToken = obj.refresh_token
      writeConfig(config)
    }
  }
)
const pubProvider = new RefreshableAuthProvider(
  new StaticAuthProvider(config.MclientID, config.MaccessToken),
  {
    clientSecret: config.MclientSecret,
    refreshToken: config.MrefreshToken,
    onRefresh: (obj) => {
      obj = obj._data
      config.MaccessToken = obj.accessToken
      config.MrefreshToken = obj.refresh_token
      writeConfig(config)
    }
  }
)

// start api client
const twitch = new ApiClient({ authProvider: mainProvider });
app.post('/game/:game', (req, res) => {
  console.log(req.params)
  const cursor = req.body.cursor;
  if(req.body.key === config.key) {
    twitch.helix.streams.getStreams({
      after: cursor !== "" ? cursor : null,
      game: req.params.game,
      type: "live",
      limit: 25
    }).then((result) => {
      console.log('sending result')
      res.json(result)
    }).catch((e) => {
      console.log(e)
      res.send(e)
    })
  } else {
    res.send({"error": 'invalid request'})
  }
})
app.post('/streams/:id', (req, res) => {
  console.log(req.params)
  const id = req.params.id
  if(req.body.key === config.key) {
    twitch.helix.streams.getStreamByUserId(id)
    .then((result) => {
      console.log('sending result')
      res.json(result)
    }).catch((e) => {
      console.log(e)
      res.send(e)
    })
  } else {
    res.send({"error": 'invalid request'})
  }
})
app.post('/user/:name', (req, res) => {
  console.log(req.params)
  const name = req.params.name
  if(req.body.key === config.key) {
    twitch.helix.users.getUserByName(name)
    .then((result) => {
      console.log('sending result')
      res.json(result)
    }).catch((e) => {
      console.log(e)
      res.send(e)
    })
  } else {
    res.send({"error": 'invalid request'})
  }
})
app.post('/channel/:name', (req, res) => {
  console.log(req.params)
  const name = req.params.name
  if(req.body.key === config.key) {
    twitch.helix.users.getUserByName(name)
    .then(async (result) => {
      result = await twitch.helix.channels.getChannelInfo(result)
      console.log(result)
      console.log('sending result')
      res.json(result)
    }).catch((e) => {
      console.log(e)
      res.send(e)
    })
  } else {
    res.send({"error": 'invalid request'})
  }
})
app.post('/followers/:name', (req, res) => {
  console.log(req.params)
  const name = req.params.name
  if(req.body.key === config.key) {
    twitch.helix.users.getUserByName(name)
    .then(async (result) => {
      let follows = await twitch.kraken.channels.getChannelFollowers(result.id)
      let response = {
        _data: []
      }
      for(let follow of follows) {
        response._data.push(follow)
      }
      console.log(response._data)
      console.log('sending result')
      res.json(response)
    }).catch((e) => {
      console.log(e)
      res.send(e)
    })
  } else {
    res.send({"error": 'invalid request'})
  }
})
app.post('/followsto/:name', (req, res) => {
  console.log(req.params)
  const name = req.params.name
  if(req.body.key === config.key) {
    twitch.helix.users.getUserByName(name)
    .then(async (result) => {
      result = await result.getFollows()
      let data = result.data
      console.log(result)
      let response = {
        _data: []
      }
      for(let user in data) {
        response._data.push(data[user]);
      }
      console.log("RESPONSE")
      console.log(response._data)
      console.log('sending result')
      res.json(response)
    }).catch((e) => {
      console.log(e)
      res.send(e)
    })
  } else {
    res.send({"error": 'invalid request'})
  }
})
http.createServer(app).listen(8080)

// start chat client
const chat = new ChatClient(mainProvider, { channels: config.channels })
chat.connect().then(() => {
  chat.onMessage(async (channel, user, message, msg) => {
    if(message[0] === "!") {
      message = message.split(' ')
      let cmd = message[0].replace("!", "").toLowerCase()
      let args = message
      args.splice(0, 1)
      if(commands.get(cmd)) {
        commands.get(cmd)(twitch, chat, pubAPI, channel, user, args)
      } else if(cmd === "help") {
        let arr = Array.from(commands.keys())
        chat.action(channel, arr.join(', '))
      } else if(cmd === "reload") {
        commands = getCommands()
        chat.action(channel, "Commands reloaded!")
      } else {
        // no command found
      }
    }
  })
});

// start pubsub client
//const pubAPI = new ApiClient({ authProvider: pubProvider });
//const pubsub = new PubSubClient();
//pubsub.registerUserListener(pubAPI).then(async (uid) => {
//  pubsub.onRedemption(uid, (msg) => {
//    msg = msg._data.data.redemption
//    switch(msg.reward.id) {
//      case "67ee6663-6481-42bc-b697-1e6e9ebcdd0a":
//        pubAPI.kraken.channels.startChannelCommercial(uid, 60).then(() => {
//           console.log("successfully ran ad")
//         }).catch((err) => {
//           console.log("error playing ad " + err)
//         })
//        break
//      case "cca8d147-3be9-4f82-8377-ffb314274a01":
//        console.log("SUCCESS")
//        break
//    }
//  })
//})
