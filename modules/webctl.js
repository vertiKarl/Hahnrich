const express = require('express');
const https = require("https");
const http = require('http')
const app = express();
const F = require('fs')
const os = require('os')
const {  cpuUsage } = require('os-utils')
const ws = require('ws');

module.exports = (Hahnrich) => {
    ///////// ROUTING AND COMMANDS //////////

    app.use("/static", express.static(__dirname + "/webctl/static"))

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


    const server =  https.createServer(credentials, app)

    // WebSocket Terminal ///////////////

    const wss = new ws.Server({ server });

    function parseCommand(target, cmd) {
        
        if(target == "core") {
            const command = cmd[0];
            const args = cmd.slice(1);
            console.log(command, args)
            switch(command) {
                case "restart":
                    if(args[0].toLowerCase() === "self" || !args[0]) {
                        // restart bot
                    } else if(Hahnrich.plugins.has(args[0])) {
                        Hahnrich.plugins.get(args[0]).kill()
                        console.log("restarting", args[0])
                        return true;
                    }
                    break;
                case "stop":
                    if(args[0].toLowerCase() === "self" || !args[0]) {
                        // restart bot
                    } else if(Hahnrich.plugins.has(args[0])) {
                        console.log(Hahnrich.plugins.get(args[0]).kill("SIGKILL"))
                        Hahnrich.plugins.delete(args[0]);
                        console.log("stopping", args[0])
                        return true;
                    }
                    break;
                case "start":
                    const files = F.readdirSync('./plugins').filter(file => file.endsWith('.js'))
                    if(args[0].toLowerCase() === "self" || !args[0]) {
                        // restart bot
                    } else if(files.includes(args[0] + ".js")) {
                        Hahnrich.startPlugin(args[0])
                        console.log("starting", args[0])
                        return true;
                    }
                    break;
                case "plugins":
                    return Array.from( Hahnrich.plugins.keys() );
                default:
                    return false;
            }

        } else if(Hahnrich.plugins.has(target)) {
            return Hahnrich.plugins.get(target).send(cmd)
        } else {
            return false;
        }
    }

    wss.on("connection", (ws) => {
        console.log("Connected")

        ws.on("message", (args) => {
            // Syntax
            // [plugin] [command] [args]
            // core restart/start/stop [plugin]
            // probe pid

            args = args.split(" ");
            const target = args[0];
            args.splice(0, 1);

            let resp = JSON.stringify(parseCommand(target, args));
            console.log(resp)

            switch(resp) {
                case "true":
                    resp = "Successfull";
                    break;
                case "false":
                    resp = "Failed";
                    break;
                default:
                    break;
            }

            ws.send(resp)

            console.log(args)
        })
    })

    /////////////////////////////////////


   server.listen(9000, () => {
        require('dns').lookup(require('os').hostname(), function (err, add, fam) {
            console.log("Control Panel available at https://" + add + ":9000/");
        })
    })

}