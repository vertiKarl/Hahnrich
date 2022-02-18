const discord = require("discord.js");
const ytdl = require("ytdl-core");
module.exports = async function (client, message, args) {
	const mediaPlayer = client[message.guild.id];

	let streamtimeformat;
	if (mediaPlayer.connection && mediaPlayer.connection.dispatcher) {
		const length = {
			minutes: 0,
			seconds: 0,
			milliseconds: mediaPlayer.connection.dispatcher.streamTime,
		};
		length.seconds = Math.floor(length.milliseconds / 1000);
		length.milliseconds %= 1000;
		length.minutes = Math.floor(length.seconds / 60);
		length.seconds %= 60;
		streamtimeformat =
			`${length.minutes}:` +
			(length.seconds < 10 ? `0${length.seconds}` : length.seconds);
	} else {
		streamtimeformat = "0:00";
	}
	let queue = "";
	const temp = await message.reply("fetching youtube titles in queue, please wait...");
	for (let i = 0; i < mediaPlayer.queue.length && i < 5; i++) {
		let name = "";
		if (checkYoutube(mediaPlayer.queue[i])) {
			name = await getYoutube(mediaPlayer.queue[i]);
		} else {
			name = mediaPlayer.queue[i];
		}

		queue += `[${i+1}] ` + name + "\n";
	}

	let currentSong = "";

	if (checkYoutube(mediaPlayer.now_playing)) {
		currentSong = await getYoutube(mediaPlayer.now_playing);
	} else if (mediaPlayer.now_playing) {
		currentSong = mediaPlayer.now_playing;
	} else {
		currentSong = "not playing anything";
	}

	let length = "";
	if (mediaPlayer.currentLength !== NaN) {
		length = mediaPlayer.currentLength;
	} else {
		length = "0:00";
	}

	let embed = new discord.MessageEmbed()
		.setColor("#d10202")
		.setTitle("Now Playing:")
		.setURL(
			"https://zap-hosting.com/de/shop/donation/b46e5e7b07106dad59febaf3b66fd5e5/"
		)
		.setAuthor(
			"Hahnrich",
			"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/cb/cb9a41873f2065b8010afa7584803d283dd7e6ad_full.jpg",
			"https://karlology.de"
		)
		.addField(await currentSong, `${streamtimeformat}/${length}`)
		.setFooter(`Queue[${mediaPlayer.queue.length}]:\n${queue}\nTo skip to a specific song in queue: !skip [number]`);
	temp.delete();
	message.reply(embed);
};

function checkYoutube(name) {
	return (
		name.startsWith("https://youtube.com/watch") ||
		name.startsWith("https://www.youtube.com/watch")
	);
}

async function getYoutube(name) {
	const temp = await ytdl.getInfo(name);
	name = "[YT] " + temp.videoDetails.title;
	return name;
}
