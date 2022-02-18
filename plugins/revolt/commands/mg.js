const discord = require("discord.js");
const MiniGame = require("../MiniGame");
module.exports = async function (client, message, args) {
	const mediaPlayer = client[message.guild.id];
    if(!mediaPlayer.minigame) mediaPlayer.minigame = new MiniGame(client, mediaPlayer);

    if(args[0]) {
        switch(args[0]) {
            case "start":
                mediaPlayer.minigame.start(message)
                break;
        }
    }
};
