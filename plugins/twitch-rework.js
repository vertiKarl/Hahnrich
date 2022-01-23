require('../MessageHandler.js');
const { ApiClient } = require('@twurple/api');
const { ChatClient } = require('@twurple/chat');
const { PubSubClient } = require('@twurple/pubsub');
const { RefreshingAuthProvider } = require('@twurple/auth')
const F = require('fs');
const dhl = require('postman-request');
const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const cors = require('cors');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
  origin: "https://karlology.eu",
  optionsSuccessStatus: 200,
  credentials: true
}))

process.on('message', (msg) => {
  // handle messages from parent
  msg = JSON.parse(msg[0])
  for(let i = 0; i < msg.length; i++) {
    if(msg[i].includes("https://clips.twitch.tv/") || msg[i].includes("clip/")) {
      let id = msg[i].replace('https://clips.twitch.tv/', '');
      id = id.split("clip/")[1] ? id.split("clip/")[1].split("?")[0] : id;
      twitch.clips.getClipById(id)
      .then((clip) => {
        clip = {
          _data: {
            id: clip.id,
            broadcaster_id: clip.broadcasterId,
            broadcaster_name: clip.broadcasterDisplayName,
            creator_id: clip.creatorId,
            creator_name: clip.creatorDisplayName,
            video_id: clip.videoId,
            game_id: clip.gameId,
            language: clip.language,
            title: clip.title,
            view_count: clip.views,
            created_at: clip.creationDate,
            thumbnailUrl: clip.thumbnailUrl,
          }
        }
        const info = clip._data
        console.log(clip)
        let link = info.thumbnailUrl.split('-preview')[0]+'.mp4'
        dhl.get(link).pipe(F.createWriteStream(`./plugins/discord/clips/${info.id}.mp4`)).on('finish', () => {
                  F.writeFileSync(`./plugins/discord/clips/${info.id}.json`, JSON.stringify(clip, null, 4))
                  console.log("discordDL", `Successfully downloaded clip "${info.title}" from channel ${info.broadcasterDisplayName}.\nYou can find it here: https://karlology.eu/clips/${info.id}`)
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
      ssl: {
        PATHTO_privateKey: "",
        PATHTO_certificate: "",
        PATHTO_ca: ""
      },
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
const clientId = config.clientID;
const clientSecret = config.clientSecret;
const tokenData = JSON.parse(F.readFileSync('./tokens.json', 'UTF-8'));
const authProvider = new RefreshingAuthProvider(
  {
    clientId,
    clientSecret,
    onRefresh: async (newTokenData) => await F.writeFile('./tokens.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
  },
  tokenData
)
const twitch = new ApiClient({ authProvider });
// const pubProvider = new RefreshableAuthProvider(
//   new StaticAuthProvider(config.MclientID, config.MaccessToken),
//   {
//     clientSecret: config.MclientSecret,
//     refreshToken: config.MrefreshToken,
//     onRefresh: (obj) => {
//       obj = obj._data
//       config.MaccessToken = obj.accessToken
//       config.MrefreshToken = obj.refresh_token
//       writeConfig(config)
//     }
//   }
// )

// start api client
// AAAAAAAAAAAA const twitch = new ApiClient({ authProvider: mainProvider });
// app.post('/game/:game', (req, res) => {
//   console.log(req.params)
//   const cursor = req.body.cursor;
//   if(req.body.key === config.key) {
//     twitch.helix.streams.getStreams({
//       after: cursor !== "" ? cursor : null,
//       game: req.params.game,
//       type: "live",
//       limit: 25
//     }).then((results) => {
//       console.log('sending result')
//       let newData = []
//       for(let result of results.data) {
//           result = {
//               id: result.id,
//               user_id: result.userId,
//               user_login: result.userName,
//               user_name: result.userDisplayName,
//               game_id: result.gameId,
//               game_name: result.gameName,
//               community_ids: null,
//               type: result.type,
//               title: result.title,
//               viewer_count: result.viewers,
//               started_at: result.startDate,
//               language: result.language,
//               thumbnail_url: result.thumbnailUrl,
//               tag_ids: result.tagIds,
//           }
//           newData.push(result)
//       }
//       results.data = newData;
//       console.log(results)
//       res.json(results)
//     }).catch((e) => {
//       console.log(e)
//       res.send(e)
//     })
//   } else {
//     res.send({"error": 'invalid request'})
//   }
// })
// app.post('/streams/:id', (req, res) => {
//   console.log(req.params)
//   const id = req.params.id
//   if(req.body.key === config.key) {
//     twitch.helix.streams.getStreamByUserId(id)
//     .then((result) => {
//       console.log('sending result')
//       result = {
//           id: result.id,
//           user_id: result.userId,
//           user_login: result.userName,
//           user_name: result.userDisplayName,
//           game_id: result.gameId,
//           game_name: result.gameName,
//           community_ids: null,
//           type: result.type,
//           title: result.title,
//           viewer_count: result.viewers,
//           started_at: result.startDate,
//           language: result.language,
//           thumbnail_url: result.thumbnailUrl,
//           tag_ids: result.tagIds,
//       }
//       res.json(result)
//     }).catch((e) => {
//       console.log(e)
//       res.send(e)
//     })
//   } else {
//     res.send({"error": 'invalid request'})
//   }
// })
// app.post('/user/:name', (req, res) => {
//   console.log(req.params)
//   const name = req.params.name
//   if(req.body.key === config.key) {
//     twitch.helix.users.getUserByName(name)
//     .then((result) => {
//         result = {
//             id: result.id,
//             login: result.login,
//             display_name: result.displayName,
//             description: result.description,
//             type: result.type,
//             broadcaster_type: result.broadcasterType,
//             profile_image_url: result.profilePictureUrl,
//             offline_image_url: result.offlinePlaceholderUrl,
//             view_count: result.views,
//             created_at: result.creationDate
//         }
//         console.log('sending result')
//         res.json(result)
//     }).catch((e) => {
//         console.log(e)
//         res.send(e)
//     })
//   } else {
//     res.send({"error": 'invalid request'})
//   }
// })
// app.post('/channel/:name', (req, res) => {
//   console.log(req.params)
//   const name = req.params.name
//   if(req.body.key === config.key) {
//     twitch.helix.users.getUserByName(name)
//     .then(async (result) => {
//       result = await twitch.helix.channels.getChannelInfo(result)
//       result = {
//           broadcaster_id: result.id,
//           broadcaster_login: result.name,
//           broadcaster_name: result.displayName,
//           broadcaster_language: result.language,
//           game_id: result.gameId,
//           game_name: result.gameName,
//           title: result.title
//       }
//       console.log('sending result')
//       res.json(result)
//     }).catch((e) => {
//       console.log(e)
//       res.send(e)
//     })
//   } else {
//     res.send({"error": 'invalid request'})
//   }
// })
// app.post('/followers/:name', (req, res) => {
//   console.log(req.params)
//   const name = req.params.name
//   if(req.body.key === config.key) {
//     twitch.helix.users.getUserByName(name)
//     .then(async (result) => {
//       let follows = await twitch.kraken.channels.getChannelFollowers(result.id, 0, 100)
//       let response = {
//         _data: []
//       }
//       for(let follow of follows) {
//           let result = follow.user;
//           follow = {
//               created_at: follow.followDate,
//               notifications: follow.hasNotifications,
//               user: {
//                   id: result.id,
//                   login: result.login,
//                   display_name: result.displayName,
//                   description: result.description,
//                   type: result.type,
//                   broadcaster_type: result.broadcasterType,
//                   profile_image_url: result.profilePictureUrl,
//                   offline_image_url: result.offlinePlaceholderUrl,
//                   view_count: result.views,
//                   created_at: result.creationDate
//               }
//           }
//         response._data.push(follow)
//       }
//       console.log(response._data)
//       console.log('sending result')
//       res.json(response)
//     }).catch((e) => {
//       console.log(e)
//       res.send(e)
//     })
//   } else {
//     res.send({"error": 'invalid request'})
//   }
// })
// app.post('/followsto/:name', (req, res) => {
//   console.log(req.params)
//   const name = req.params.name
//   if(req.body.key === config.key) {
//     twitch.helix.users.getUserByName(name)
//     .then(async (result) => {
//       result = await result.getFollows()
//       let data = result.data
//       console.log(result)
//       let response = {
//         _data: []
//       }
//       for(let user in data) {
//           data[user] = {
//               from_id: data[user].userId,
//               from_login: data[user].userName,
//               from_name: data[user].userDisplayName,
//               to_id: data[user].followedUserId,
//               to_login: data[user].followedUserName,
//               to_name: data[user].followedUserDisplayName,
//               followed_at: data[user].followDate
//           }
//         response._data.push(data[user]);
//       }
//       console.log("RESPONSE")
//       console.log(response._data)
//       console.log('sending result')
//       res.json(response)
//     }).catch((e) => {
//       console.log(e)
//       res.send(e)
//     })
//   } else {
//     res.send({"error": 'invalid request'})
//   }
// })
// const https = require('https');
// const privateKey = F.readFileSync(config.ssl.PATHTO_privateKey, 'utf8');
// const certificate = F.readFileSync(config.ssl.PATHTO_certificate, 'utf8');
// const ca = F.readFileSync(config.ssl.PATHTO_ca, 'utf8');
// const credentials = {
//   key: privateKey,
//   cert: certificate,
//   ca: ca
// }
// https.createServer(credentials, app).listen(8443, () => {
//   console.log("Server running on https://localhost:8443");
// });

// start chat client
// const chat = new ChatClient(mainProvider, { channels: config.channels })
// chat.connect().then(() => {
//   chat.onMessage(async (channel, user, message, msg) => {
//     if(message[0] === "!") {
//       message = message.split(' ')
//       let cmd = message[0].replace("!", "").toLowerCase()
//       let args = message
//       args.splice(0, 1)
//       if(commands.get(cmd)) {
//         commands.get(cmd)(twitch, chat, pubAPI, channel, user, args)
//       } else if(cmd === "help") {
//         let arr = Array.from(commands.keys())
//         chat.action(channel, arr.join(', '))
//       } else if(cmd === "reload") {
//         commands = getCommands()
//         chat.action(channel, "Commands reloaded!")
//       } else {
//         // no command found
//       }
//     }
//   })
// });

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
