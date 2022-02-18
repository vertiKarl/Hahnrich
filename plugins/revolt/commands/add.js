const F = require("fs");
const ytdl = require("ytdl-core");
const { spawn } = require("child_process");
const search = require("youtube-search");
const discord = require("discord.js");
const MAXLENGTH = 360;
module.exports = function (client, message, args, key) {
	const mediaPlayer = client[message.guild.id];

	let indexOfForce = args.lastIndexOf("force");
	forced = indexOfForce === args.length - 1;
	if (forced) args.splice(indexOfForce, 1);

	if (
		args[0] &&
		(args[0].startsWith("https://youtube.com/watch") ||
			args[0].startsWith("https://www.youtube.com/watch"))
	) {
		downloadSong(message, args[0]).then(file => {
			if (forced) {
				mediaPlayer.queue.unshift(file);
			} else {
				mediaPlayer.queue.push(file);
			}
			play(client, message, mediaPlayer);
		});
	} else if (args[0]) {
    searchForSong(args, key, message, mediaPlayer, client).then(res => console.log(res))
	}
};

async function searchForSong(args, key, message, mediaPlayer, client) {
  return new Promise((resolve, reject) => {
    let opts = {
      maxResults: 5,
      key: key,
      type: "video"
    };
    search(args.join(" "), opts, (err, results) => {
      if (err) {
        message.reply("error searching for " + args.join(" "));
        console.log("Failed searching for " + args.join(" ") + "\n" + err);
      } else {
        let answer = "";
        for (let i = 0; i < results.length; i++) {
          answer += `[${i + 1}] (${results[i].channelTitle}) ${
            results[i].title
          }\n`;
        }
        let embed = new discord.MessageEmbed()
          .setColor("#d10202")
          .setTitle("Search results:")
          .setURL(
            "https://zap-hosting.com/de/shop/donation/b46e5e7b07106dad59febaf3b66fd5e5/"
          )
          .setAuthor(
            "Hahnrich",
            "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/cb/cb9a41873f2065b8010afa7584803d283dd7e6ad_full.jpg",
            "https://karlology.de"
          )
          .setFooter(`Results[${results.length}]:\n${answer}`);
        message.reply(embed).then((msg) => {
          let possibleReactions = ["1⃣", "2⃣", "3⃣", "4⃣", "5⃣"];
          possibleReactions = possibleReactions.splice(
            0,
            Math.min(results.length, possibleReactions.length)
          );
          if (possibleReactions.length > 0) {
            possibleReactions.push("😱");
          }
          possibleReactions.forEach((r) => {
            try{
              msg.react(r);
            } catch(e) {
              // message has been deleted
            }
          });
  
          const filter = (reaction, user) => {
            return (
              possibleReactions.includes(reaction.emoji.name) &&
              user.id === message.author.id
            );
          };
  
          if (possibleReactions.length > 0)
            msg
              .awaitReactions(filter, {
                max: 1,
                time: 60000,
                errors: ["time"],
              })
              .then(async (collected) => {
                const reaction = collected.first();
  
                let filesToPush = [];
                let path = "";
  
                switch (reaction.emoji.name) {
                  case "1⃣":
                    path = await downloadSong(message, results[0].link)
                    filesToPush.push(await path);
                    break;
                  case "2⃣":
                    path = await downloadSong(message, results[1].link)
                    filesToPush.push(await path);
                    break;
                  case "3⃣":
                    path = await downloadSong(message, results[2].link)
                    filesToPush.push(await path);
                    break;
                  case "4⃣":
                    path = await downloadSong(message, results[3].link)
                    filesToPush.push(await path);
                    break;
                  case "5⃣":
                    path = await downloadSong(message, results[4].link)
                    filesToPush.push(await path);
                    break;
                  case "😱":
                    for (let i = 0; i < results.length; i++) {
                      path = await downloadSong(message, results[i].link)
                      filesToPush.push(await path);
                    }
                    break;
                }
                if (forced) {
                  mediaPlayer.queue = [].concat(
                    filesToPush,
                    mediaPlayer.queue
                  );
                  if (mediaPlayer.connection) mediaPlayer.next();
                } else {
                  mediaPlayer.queue = mediaPlayer.queue.concat(filesToPush);
                }
                if (!mediaPlayer.connection) {
                  require("./join.js")(client, message, args)
                    .then((con) => {
                      mediaPlayer.connection = con;
                      mediaPlayer.next();
                    })
                    .catch((err) => {
                      console.log("error:", err);
                      message.reply("failed joining");
                    });
                } else if (mediaPlayer.now_playing === "") {
                  mediaPlayer.next();
                }
              })
              .catch((collected) => {
                // if time runs out delete messages
                try {
                  message.delete();
                  msg.delete();
                } catch(e) {

                }
                
              });
        });
      }
    });
  });
}

async function downloadSong(message, args) {
	return new Promise((resolve, reject) => {
    ytdl
      .getInfo(args)
      .then((info) => {
        if (info.videoDetails.lengthSeconds <= MAXLENGTH) {
          info.videoDetails.title =
            info.videoDetails.title
              .replace(/[^a-z0-9 ]/gi, "")
              .replace(/[ ]/gi, "_") + ".mp3";

          try {
            if (
              F.existsSync(__dirname + `/../songs/${info.videoDetails.title}`)
            ) {
              resolve(info.videoDetails.title);
              return;
            }
          } catch (e) {
            reject(e);
            console.error(e);
          }
          let title = info.videoDetails.title;
          message.reply("downloading: "+title).then(progress => {
            ytdl(args, {
              filter: "audioonly",
            })
              .pipe(
                F.createWriteStream(
                  __dirname + `/../songs/${info.videoDetails.title}`
                )
              )
              .on("finish", () => {
                progress.edit("normalizing audio for: " + title);
                const file = __dirname + `/../songs/${info.videoDetails.title}`;
                const child = spawn("ffmpeg", [
                  "-y",
                  "-i",
                  `${file}`,
                  "-af",
                  "loudnorm=I=-16:LRA=11:TP=-1.5",
                  `${file.split(".mp3")[0]}.tmp.mp3`,
                ]);
                child.stdout.on("data", (data) => {
                  // uncomment to debug ffmpeg output
                  // console.log(`stdout: ${data}`);
                });
  
                child.stderr.on("data", (data) => {
                  // uncomment to debug ffmpeg output
                  // console.error(`stderr: ${data}`);
                });
  
                child.on("close", (code) => {
                  progress.edit("done: " + title);
                  if (code === 0) {
                    F.rename(
                      `${file.split(".mp3")[0]}.tmp.mp3`,
                      `${file}`,
                      (err) => {
                        if (err) {
                          reject(err);
                          console.log(err);
                        } else {
                          resolve(info.videoDetails.title);
                        }
                      }
                    );
                  } else {
                    reject(code, "Failed converting: " + file);
                    console.log(code, "Failed converting: " + file);
                  }
                });
              })
              .on("error", (e) => {
                console.log(e);
                reject(e);
              });
          })
        } else {
          reject(
            `The requested video is too long. Maxlength is ${MAXLENGTH} seconds (${
              MAXLENGTH / 60
            } Minutes)`
          );
        }
      })
      .catch((e) => {
        console.log(e);
      });
	});
}

function play(client, message, mediaPlayer) {
	// connect to channel if not done yet
	if (!mediaPlayer.connection) {
		require("./join.js")(client, message)
			.then((con) => {
				mediaPlayer.connection = con;
				mediaPlayer.next();
			})
			.catch((err) => {
				console.log("error:", err);
				message.reply("failed joining");
			});
	} else if (mediaPlayer.now_playing === "") {
		mediaPlayer.next();
	}
}
