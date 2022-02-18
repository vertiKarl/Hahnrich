require('../MessageHandler.js');
const {
  ApiClient
} = require('@twurple/api');
const {
  ChatClient
} = require('@twurple/chat');
const {
  PubSubClient
} = require('@twurple/pubsub');
const {
  RefreshingAuthProvider
} = require('@twurple/auth')
const F = require('fs');
const dhl = require('postman-request');
const express = require('express');
const fauna = require('faunadb');
const app = express();

const bodyParser = require('body-parser');
const cors = require('cors');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(cors({
  origin: "https://karlology.eu",
  optionsSuccessStatus: 200,
  credentials: true
}))

const {
  Paginate,
  Get,
  Select,
  Match,
  Index,
  Create,
  Collection,
  Lambda,
  Ref,
  Var,
  Join,
  Update
} = fauna.query;

process.on('message', (msg) => {
  // handle messages from parent
  msg = JSON.parse(msg[0])
  for (let i = 0; i < msg.length; i++) {
    if (msg[i].includes("https://clips.twitch.tv/") || msg[i].includes("clip/")) {
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
          let link = info.thumbnailUrl.split('-preview')[0] + '.mp4'
          dhl.get(link).pipe(F.createWriteStream(`./plugins/discord/clips/${info.id}.mp4`)).on('finish', async () => {
            const data = info;
            data.created_at = info.created_at +"";
            await client.query(
              Get(
                Match(
                  Index("videos_by_id"),
                  data.id
                )
              )
            ).then((res) => {
              console.log(res.ref.id);
              console.log("discordDL", `The clip "${info.title}" already downloaded.\nYou can find it here: https://karlology.eu/clips/${res.ref.id}`)
              console.log("revoltDL", `The clip "${info.title}" already downloaded.\nYou can find it here: https://karlology.eu/clips/${res.ref.id}`)
            }).catch(async (err) => {
                if (err.name === "NotFound") {
                  const resp = await client.query(
                    Create(
                      Collection("videos"),
                      { data }
                    )
                  );
                  console.log("discordDL", `Successfully downloaded clip "${info.title}" from channel ${info.broadcaster_name}.\nYou can find it here: https://karlology.eu/clips/${resp.ref.id}`);
                  console.log("revoltDL", `Successfully downloaded clip "${info.title}" from channel ${info.broadcaster_name}.\nYou can find it here: https://karlology.eu/clips/${resp.ref.id}`);
                } else {
                  console.error(err);
                }
              })
            
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
function loadConfig(og = false) {
  let cfg = JSON.parse(F.readFileSync('config.json'));
  if (!cfg.pluginSettings.twitch) {
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
const client = new fauna.Client({
  domain: "db.eu.fauna.com",
  secret: config.faunaToken
})

function writeConfig(settings) {
  const config = loadConfig(true)
  config.pluginSettings.twitch = settings
  F.writeFileSync('config.json', JSON.stringify(config, null, 4))
}

function getCommands() {
  const files = F.readdirSync('./plugins/twitch/commands').filter(file => file.endsWith('.js'))
  let c = new Map()
  for (const file of files) {
    c.set(file.replace('.js', ''), (require("./twitch/commands/" + file)));
  }
  return c
}
let commands = getCommands()

// set up token refresh
const clientId = config.clientID;
const clientSecret = config.clientSecret;
const tokenData = JSON.parse(F.readFileSync('./tokens.json', 'UTF-8'));
const authProvider = new RefreshingAuthProvider({
    clientId,
    clientSecret,
    onRefresh: async (newTokenData) => await F.writeFile('./tokens.json', JSON.stringify(newTokenData, null, 4), 'UTF-8', () => {})
  },
  tokenData
)
const twitch = new ApiClient({
  authProvider
});