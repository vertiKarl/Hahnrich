require("../MessageHandler.js");
import("revolt.js").then(Revolt => {
	const client = new Revolt.Client();
	// const dhl = require("postman-request");
	// const { spawn } = require("child_process");
	const F = require("fs");
	let lastDL;
	const ytdl = require("ytdl-core");
	// const MediaPlayer = require("./revolt/MediaPlayer.js");
	
	process.on("message", (msg) => {
		//console.log(msg)
		if(msg.includes("clip") && lastDL) {
			lastDL.reply(msg.join(" "));
		} else if(msg[0].startsWith("send")) {
			if(client.channels.cache.get(msg[1])) {
				client.channels.cache.get(msg[1]).send(msg.slice(2).join(" "))
			} else if(client.users.cache.get(msg[1])) {
				client.users.cache.get(msg[1]).send(msg.slice(2).join(" "))
			} else {
				console.log("Channel or User not found.")
			}
		}
	});
	
	// load config
	function loadConfig(og = false) {
		let cfg = JSON.parse(F.readFileSync("config.json"));
		if (!cfg.pluginSettings.revolt) {
			cfg.pluginSettings.revolt = {
				token: "",
				permittedIDs: [0],
				"youtube-key": "",
			};
			F.writeFileSync("config.json", JSON.stringify(cfg, null, 4));
			return og ? cfg : cfg.pluginSettings.revolt;
		} else {
			return og ? cfg : cfg.pluginSettings.revolt;
		}
	}
	let config = loadConfig();
	
	function writeConfig(settings) {
		const config = loadConfig(true);
		config.pluginSettings.revolt = settings;
		F.writeFileSync("config.json", JSON.stringify(config, null, 4));
	}
	
	function getCommands() {
		const files = F.readdirSync("./plugins/revolt/commands").filter((file) =>
			file.endsWith(".js")
		);
		let c = new Map();
		for (const file of files) {
			c.set(file.replace(".js", ""), require("./revolt/commands/" + file));
		}
		return c;
	}
	let commands = getCommands();
	
	client.on("ready", () => {
		console.log(`Logged in as ${client.user.username}`);
		// client.guilds.cache.each((guild) => {
		// 	client[guild.id] = new MediaPlayer();
		// });
	});
	
	client.on("message", async (message) => {
		if (message.author === client.user) return;
		try {
			if (message.content[0] === "!") {
				let msg = message.content.split(" ");
				let cmd = msg[0].replace("!", "").toLowerCase();
				let args = msg;
				args.splice(0, 1);
				if (commands.get(cmd)) {
					if (cmd === "s") {
						if (!message.channel.name.includes("innocent")) return;
						lastDL = message;
					}
					if (["del"].includes(cmd)) {
						if (!config.permittedIDs.includes(message.author.id)) {
							message.reply("no permission");
							return;
						}
					}
					if (["play","add"].includes(cmd)) {
						commands.get(cmd)(client, message, args, config["youtube-key"]);
				return;
					}
					commands.get(cmd)(client, message, args);
				} else if (cmd === "help") {
					let arr = Array.from(commands.keys());
					let help = JSON.parse(
						F.readFileSync("./plugins/revolt/commands.json")
					);
					let embed = new revolt.MessageEmbed()
						.setColor("#d10202")
						.setTitle("List of commands:")
						.setURL(
							"https://zap-hosting.com/de/shop/donation/b46e5e7b07106dad59febaf3b66fd5e5/"
						)
						.setAuthor(
							"Hahnrich",
							"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/cb/cb9a41873f2065b8010afa7584803d283dd7e6ad_full.jpg",
							"https://karlology.de"
						);
					for (let c of Object.keys(help)) {
						embed.addField(c, `${help[c]}`, true);
					}
					message.reply(embed);
				} else if (cmd === "reload") {
					commands = getCommands();
					message.reply("Commands reloaded!");
				} else {
					// no command found
				}
			}
		} catch(err) {
			message.reply(err)
		}
	});
	
	client.loginBot(config.token);
});
