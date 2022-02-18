const search = require('youtube-search');
const discord = require('discord.js');
module.exports = function(client, message, args, key) {
  const mediaPlayer = client[message.guild.id]
  if(args[0] && (args[0].startsWith('https://youtube.com/watch') || args[0].startsWith('https://www.youtube.com/watch'))) {
    if(args[1] && args[1].toLowerCase() === "force") {
      mediaPlayer.queue.unshift(args[0]);
      if(mediaPlayer.connection) mediaPlayer.next();
    } else {
      mediaPlayer.queue.push(args[0]);
    }
    // connect to channel if not done yet
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
  } else if(args[0]) {
    let opts = {
      maxResults: 5,
      key: key,
      type: "video"
    }

    let indexOfForce = args.lastIndexOf("force");
    forced = (indexOfForce === args.length - 1);
    if(forced) args.splice(indexOfForce, 1);

    search(args.join(" "), opts, (err, results) => {
      if(err) {
        message.reply("error searching for "+args.join(" "));
        console.log("Failed searching for "+args.join(" ")+"\n"+err)
      } else {
        let answer = ""
        for(let i = 0; i < results.length; i++) {
            answer += `[${i+1}] (${results[i].channelTitle}) ${results[i].title}\n`
        }
        let embed = new discord.MessageEmbed()
            .setColor('#d10202')
            .setTitle('Search results:')
            .setURL('https://zap-hosting.com/de/shop/donation/b46e5e7b07106dad59febaf3b66fd5e5/')
            .setAuthor('Hahnrich', 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/cb/cb9a41873f2065b8010afa7584803d283dd7e6ad_full.jpg', 'https://karlology.de')
            .setFooter(`Results[${results.length}]:\n${answer}`)
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

                  let linksToPush = [];

                  switch(reaction.emoji.name) {
                      case "1⃣":
                          linksToPush.push(results[0].link);
                          break;
                      case "2⃣":
                          linksToPush.push(results[1].link);
                          break;
                      case "3⃣":
                          linksToPush.push(results[2].link);
                          break;
                      case "4⃣":
                          linksToPush.push(results[3].link);
                          break;
                      case "5⃣":
                          linksToPush.push(results[4].link);
                          break;
                      case "😱":
                          for(let i = 0; i < results.length; i++) {
                            linksToPush.push(results[i].link);
                          }
                          break;
                  }
                  if(forced) {
                      mediaPlayer.queue = [].concat(linksToPush, mediaPlayer.queue);
                      if(mediaPlayer.connection) mediaPlayer.next();
                  } else {
                      mediaPlayer.queue = mediaPlayer.queue.concat(linksToPush);
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
      }
    })
  } else {
    message.reply("!play [text|yt-link]")
  }
}
