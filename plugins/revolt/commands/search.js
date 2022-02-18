const F = require('fs')
const discord = require('discord.js')
module.exports = function(client, message, args) {
  const mediaPlayer = client[message.guild.id]
  if(args[0]) {
    let results = [];
    let fancyResults = [];
    let i = 1;

    let indexOfForce = args.lastIndexOf("force");
    forced = (indexOfForce === args.length - 1);
    if(forced) args.splice(indexOfForce, 1);

    F.readdirSync(__dirname + `/../songs/`).forEach(file => {
        if(file.toLowerCase().includes(args.join(' ').toLowerCase())) {
            results.push(file);
            fancyResults.push((i++) +": "+ file);
        }
    })
    let embed = new discord.MessageEmbed()
            .setColor('#d10202')
            .setTitle('Search results:')
            .setURL('https://zap-hosting.com/de/shop/donation/b46e5e7b07106dad59febaf3b66fd5e5/')
            .setAuthor('Hahnrich', 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/cb/cb9a41873f2065b8010afa7584803d283dd7e6ad_full.jpg', 'https://karlology.de')
            .setFooter(`Results[${results.length}]:\n${fancyResults.slice(0, 5).join("\n")}`)
    message.reply(embed).then(msg => {
        let possibleReactions = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣'];
        possibleReactions = possibleReactions.splice(0, Math.min(results.length, possibleReactions.length));
        if(possibleReactions.length > 0) {
            possibleReactions.push('😱');
        }
        possibleReactions.forEach(r => {
            msg.react(r);
        })

        const filter = (reaction, user) => {
            return possibleReactions.includes(reaction.emoji.name) && user.id === message.author.id;
        };
        
        if(possibleReactions.length > 0) msg.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();

                let filesToPush = [];

                switch(reaction.emoji.name) {
                    case "1⃣":
                        filesToPush.push(results[0]);
                        break;
                    case "2⃣":
                        filesToPush.push(results[1]);
                        break;
                    case "3⃣":
                        filesToPush.push(results[2]);
                        break;
                    case "4⃣":
                        filesToPush.push(results[3]);
                        break;
                    case "5⃣":
                        filesToPush.push(results[4]);
                        break;
                    case "😱":
                        filesToPush = filesToPush.concat(results);
                        break;
                }
                if(forced) {
                    mediaPlayer.queue = [].concat(filesToPush, mediaPlayer.queue);
                    if(mediaPlayer.connection) mediaPlayer.next();
                } else {
                    mediaPlayer.queue = mediaPlayer.queue.concat(filesToPush);
                }
                if(!mediaPlayer.connection) {
                    require('./join.js')(client, message, args)
                    .then((con) => {
                      mediaPlayer.connection = con
                      mediaPlayer.next()
                    })
                    .catch((err) => {
                      console.log("error:", err)
                      message.reply('failed joining')
                    })
                } else if(mediaPlayer.now_playing === '') {
                    mediaPlayer.next()
                }
            })
            .catch(collected => {
                // if time runs out delete messages
                message.delete();
                msg.delete();
            });
    })
  } else {
    message.reply("No searchterm specified.")
  }
}
