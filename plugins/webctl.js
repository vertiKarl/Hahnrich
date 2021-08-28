require('../MessageHandler.js');
const express = require('express');
const https = require("https");
const app = express();
const F = require('fs')
const os = require('os')
const {  cpuUsage } = require('os-utils')
const ws = require('ws');

process.on('message', (msg) => {
  // handle messages from parent
})

///////// ROUTING AND COMMANDS //////////

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/webctl/index.html")
})

app.get("/CPU", (req, res) => {
    cpuUsage((pct) => 
        res.json({
            cores: os.cpus(),
            usage: pct
        })
    )
})

app.get("/RAM", (req, res) => {
    res.json({
        total: os.totalmem(),
        free: os.freemem()
    })
})

app.get("/PC", (req, res) => {
    res.json({
        arch: os.arch(),
        release: os.release(),
        platform: os.platform(),
        type: os.type(),
        version: os.version(),
        hostname: os.hostname(),
        networkifs: os.networkInterfaces(),
        uptime: os.uptime()
    })
})

////////////////////////////////////////

// load config
function loadConfig(og=false) {
    let cfg = JSON.parse(F.readFileSync('config.json'));
    if(!cfg.pluginSettings.webctl) {
      cfg.pluginSettings.webctl = {
        ssl: {
          PATHTO_privateKey: "",
          PATHTO_certificate: "",
          PATHTO_ca: ""
        }
      }
      F.writeFileSync('config.json', JSON.stringify(cfg, null, 4))
      throw new Error("Please set SSL-Information")
      return og ? cfg : cfg.pluginSettings.twitch;
    } else {
      return og ? cfg : cfg.pluginSettings.twitch;
    }
  }
let config = loadConfig();
const privateKey = F.readFileSync(config.ssl.PATHTO_privateKey, 'utf8');
const certificate = F.readFileSync(config.ssl.PATHTO_certificate, 'utf8');
const ca = F.readFileSync(config.ssl.PATHTO_ca, 'utf8');
const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
  }
  
function writeConfig(settings) {
    const config = loadConfig(true)
    config.pluginSettings.webctl = settings
    F.writeFileSync('config.json', JSON.stringify(config, null, 4))
}

const server = https.createServer(credentials, app)
server.listen(9000, () => {
    require('dns').lookup(require('os').hostname(), function (err, add, fam) {
        console.log("Control Panel available at https://" + add + ":9000/");
    })
})

// WebSocket Terminal ///////////////

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("Connected")
})

/////////////////////////////////////

console.log("started")
