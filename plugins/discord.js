require("../MessageHandler.js");
const discord = require("discord.js");
const client = new discord.Client();
const dhl = require("postman-request");
const { spawn } = require("child_process");
const F = require("fs");
let lastDL;
const ytdl = require("ytdl-core");
const MediaPlayer = require("./discord/MediaPlayer.js");

process.on("message", (msg) => {
	console.log(msg)
	if(msg[0].includes("clip")) {
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
	if (!cfg.pluginSettings.discord) {
		cfg.pluginSettings.discord = {
			token: "",
			permittedIDs: [0],
			"youtube-key": "",
		};
		F.writeFileSync("config.json", JSON.stringify(cfg, null, 4));
		return og ? cfg : cfg.pluginSettings.discord;
	} else {
		return og ? cfg : cfg.pluginSettings.discord;
	}
}
let config = loadConfig();

function writeConfig(settings) {
	const config = loadConfig(true);
	config.pluginSettings.discord = settings;
	F.writeFileSync("config.json", JSON.stringify(config, null, 4));
}

function getCommands() {
	const files = F.readdirSync("./plugins/discord/commands").filter((file) =>
		file.endsWith(".js")
	);
	let c = new Map();
	for (const file of files) {
		c.set(file.replace(".js", ""), require("./discord/commands/" + file));
	}
	return c;
}
let commands = getCommands();

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}`);
	client.user.setPresence({
		activity: {
			name: `Version ${require("../package.json").version}`,
			type: "STREAMING",
			url: "https://twitch.tv/vertiKarl",
		},
		status: "online",
	});
	client.guilds.cache.each((guild) => {
		client[guild.id] = new MediaPlayer();
	});
});

client.on("message", (message) => {
	if (message.author === client.user) return;
	if (
		message.channel["type"] !== "dm" && 
		message.channel.name.includes("bot") &&
		client[message.guild.id].minigame &&
		client[message.guild.id].minigame.status === "active"
	) {
		client[message.guild.id].minigame.registerMessage(message);
	} else if (
		message.channel["type"] !== "dm" &&
			(message.channel.name.includes("bot") ||
		message.channel.name.includes("innocent"))
	) {
		if (message.attachments.first()) {
			message.attachments.each((file) => {
				console.log(file);
				if (file.name.endsWith(".mp3")) {
					dhl
						.get(message.attachments.first().url)
						.on("error", (err) => {
							message.reply(err);
						})
						.pipe(
							F.createWriteStream(__dirname + "/discord/songs/" + file.name)
						)
						.on("finish", () => {
							const file_ = __dirname + `/discord/songs/${file.name}`;
							const child = spawn("ffmpeg", [
								"-y",
								"-i",
								`${file_}`,
								"-af",
								"loudnorm=I=-16:LRA=11:TP=-1.5",
								`${file_.split(".mp3")[0]}.tmp.mp3`,
							]);
							child.stdout.on("data", (data) => {
								// uncomment to debug ffmpeg output
								//console.log(`stdout: ${data}`);
							});

							child.stderr.on("data", (data) => {
								// uncomment to debug ffmpeg output
								//console.error(`stderr: ${data}`);
							});

							child.on("close", (code) => {
								if (code === 0) {
									F.rename(
										`${file_.split(".mp3")[0]}.tmp.mp3`,
										`${file_}`,
										(err) => {
											if (err) {
												console.log(err);
											} else {
												client[message.guild.id].queue.push(file.name);
												if (client[message.guild.id].connection) {
													if (
														!client[message.guild.id].now_playing ||
														client[message.guild.id].now_playing === ""
													) {
														client[message.guild.id].next();
													}
												} else {
													require("./discord/commands/join.js")(
														client,
														message,
														[]
													)
														.then((con) => {
															client[message.guild.id].connection = con;
															client[message.guild.id].next();
														})
														.catch((err) => {
															message.reply(err);
														});
												}
											}
										}
									);
								} else {
									console.log(code, "Failed converting: " + file_);
								}
							});
						});
				}
			});
		} else if (message.content[0] === "!") {
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
					F.readFileSync("./plugins/discord/commands.json")
				);
				let embed = new discord.MessageEmbed()
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
	}
});

client.login(config.token);
