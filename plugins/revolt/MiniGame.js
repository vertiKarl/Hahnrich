const discord = require("discord.js");
const meta = require("music-metadata");
const fs = require("fs");

function map(num, in_min, in_max, out_min, out_max) {
	return ((num - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
}

module.exports = class MiniGame {
	constructor(client, mediaPlayer) {
		this.client = client;
		this.mediaPlayer = mediaPlayer;
		this.status = "off";
		this.answer = "";
		this.guesses = new Map();
		this.dispatcher = null;
	}

	async start(message, repeat = false) {
		if (this.status !== "active") {
			if (!repeat) message.delete();
			this.guesses = new Map();
			this.status = "active";
			this.mediaPlayer.now_playing = "Queue paused while MiniGame is active.";
			this.mediaPlayer.currentLength = "no";
			this.embed = new discord.MessageEmbed()
				.setColor("#d10202")
				.setTitle("Minigame:")
				.setURL(
					"https://zap-hosting.com/de/shop/donation/b46e5e7b07106dad59febaf3b66fd5e5/"
				)
				.setAuthor(
					"Hahnrich",
					"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/cb/cb9a41873f2065b8010afa7584803d283dd7e6ad_full.jpg",
					"https://karlology.de"
				)
				.setFooter("Guess the current song by sending a message below!");
			this.embedMessage = await message.channel.send(this.embed);
			if (!this.mediaPlayer.connection) {
				const con = await require("./commands/join.js")(
					this.client,
					message,
					{}
				);
				this.mediaPlayer.connection = con;
			}
			const songs = fs.readdirSync(__dirname + "/songs");
			const song = songs[Math.floor(Math.random() * songs.length)];
			this.answer = song.replace(".mp3", "");

			let seekTo = 0;
			const metadata = await meta.parseFile(`${__dirname}/songs/${song}`, {
				duration: true,
			});
			seekTo = Math.floor(metadata.format.duration);
			seekTo = map(Math.random(), 0, 1, 0, seekTo - 5);

			this.dispatcher = this.mediaPlayer.connection.play(
				`${__dirname}/songs/${song}`,
				{ seek: seekTo }
			);
			setTimeout(() => {
				this.dispatcher.pause();
			}, 5000);
			this.timer = new Date();
			setTimeout(() => {
				this.checkRight(message);
				this.dispatcher = this.mediaPlayer.connection.play(
					`${__dirname}/songs/${song}`,
					{ seek: seekTo + 5 }
				);
				this.dispatcher.on("finish", () => {
					if (this.mediaPlayer.connection) {
						this.mediaPlayer.next();
					}
				});
				if (pain) {
					clearInterval(pain);
				}
			}, 20000);
			const pain = setInterval(() => {
				this.embed.setTitle(
					`Minigame[${Math.ceil(
						20 - (new Date().getTime() - this.timer.getTime()) / 1000
					)}s]:`
				);
				this.embedMessage.edit(this.embed);
			}, 5000);
		}
	}

	checkRight() {
		let str = "";
		this.guesses.forEach((guess) => {
			str +=
				(guess.isRight ? ":white_check_mark:" : "❌") +
				guess.author.username +
				" => " +
				guess.msg +
				"\n";
		});
		this.embed.setTitle("Minigame:");
		this.embed.addField("Time is up!", str + "The answer was: " + this.answer);
		this.embed.setFooter("Want to play again?");
		this.embedMessage.edit(this.embed);
		//message.channel.send("time is up the answer was: " + this.answer);
		this.status = "off";
		this.embedMessage.react("🔁");
		const filter = (reaction, user) => {
			return "🔁".includes(reaction.emoji.name) && user !== this.client.user;
		};
		this.embedMessage
			.awaitReactions(filter, { max: 1, time: 60000, errors: ["time"] })
			.then((collected) => {
				this.start(this.embedMessage, true);
			})
			.catch((e) => {});
	}

	registerMessage(message) {
		message.delete();
		let answer = this.answer;
		answer = answer.replace(/[^[a-zA-Z0-9]/g, "").toLowerCase(), message.content.toLowerCase().replace(/[^[a-zA-Z0-9]/g, "");
		const messageParsed = message.content.toLowerCase().replace(/[^[a-zA-Z0-9]/g, "");
		this.guesses.set(message.author.id, {
			author: message.author,
			msg: message.content,
			isRight:
				answer.includes(messageParsed) &&
				messageParsed.length >= Math.min(Math.ceil(answer.length / 4), 5)
		});

		let str = "";
		this.guesses.forEach((guess) => {
			str += guess.author.username + "\n";
		});

		this.embed.setFooter(
			`Guess the current song by sending a message below!\nEntries[${this.guesses.size}]\n` +
				str
		);
		this.embedMessage.edit(this.embed);
	}
};
