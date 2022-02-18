const fs = require('fs');

module.exports = function(client, message, args) {
    const mediaPlayer = client[message.guild.id]
    const selection = mediaPlayer.now_playing;
    message.reply("Are you sure you want to delete "+selection+"?").then(msg => {
        const possibleReactions = ['👍', '👎']

        possibleReactions.forEach(r => {
            msg.react(r);
        })

        const filter = (reaction, user) => {
            return possibleReactions.includes(reaction.emoji.name) && user.id === message.author.id;
        };

        msg.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(collected => {
            const reaction = collected.first();
    
            if (reaction.emoji.name === '👍') {
                fs.rm(__dirname + `/../songs/${selection}`, () =>{})
                mediaPlayer.next();
                const tmp = message.reply('deleted.');
                message.delete();
                msg.delete();
                tmp.delete();
            } else {
                const tmp = message.reply('canceled.');
                message.delete();
                msg.delete();
                tmp.delete();
            }
        })
        .catch(collected => {
            
        });
    })
}