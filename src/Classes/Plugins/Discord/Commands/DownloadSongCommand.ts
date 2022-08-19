import { CommandInteraction, CacheType, PermissionsBitField, ContextMenuCommandBuilder, ApplicationCommandType, MessageContextMenuCommandInteraction } from "discord.js";
import EventEmitter from "events";
import ytdl from "ytdl-core";
import Command from "../Command";
import ExtendedClient from "../ExtendedClient";
import Song, { SongType } from "../MediaPlayer/Song";
import fs from "fs";
import { spawn } from "child_process";

export default class DownloadSongCommand extends Command {
    data = new ContextMenuCommandBuilder();
    permissions = [PermissionsBitField.Flags.Administrator];

    constructor() {
        super()
        this.data
        .setName("cache")
        .setType(ApplicationCommandType.Message);
    }

    async execute(client: ExtendedClient, interaction: MessageContextMenuCommandInteraction, events?: EventEmitter | undefined): Promise<boolean> {
        if(interaction.guildId && interaction.targetMessage.author.id === client?.user?.id) {
            const mp = client.mediaplayers.get(interaction.guildId);

            interaction.deferReply({ ephemeral: true });

            if(!mp) {
                interaction.editReply("No message history available!")
                console.debug("Mediaplayer not found")
                return false;
            }

            const song = mp.messageHistory.get(interaction.targetId);

            if(!song) {
                interaction.editReply("Message not in current history!")
                console.debug("Song not found in history")
                return false;
            }



            console.debug("Requesting to download:", await song.name)

            switch(song.type) {
                case SongType.YOUTUBE: {
                    const success = await downloadSong(song);
                    if(success) {
                        interaction.editReply(`Finished downloading ${await song.name}!`)
                    } else {
                        interaction.editReply(`Encountered error downloading ${await song.name}! (Check logs!)`)
                    }
                    break;
                }
                default: {
                    interaction.editReply("Song already cached!");
                    break;
                }
            }
        } else {
            console.debug("Not Hahnrich")
        }

        return true;
    }
}


async function downloadSong(song: Song): Promise<boolean> {
    const MAX_LENGTH = 60 * 10;
    const length = await song.length;

    if(length > MAX_LENGTH) return false;

    const title = (await song.name).replace(/[\/\\]/gi, "");
    
    // /home/vertikarl/Hahnrich/src/Classes/Plugins/Discord/Commands/../../../../../Songs/Thomas G. Hornauer - Toilette.mp3
    const path = __dirname + "/../../../../../Songs/";
    const fullPath = path + `${title}.mp3`;

	return new Promise((resolve, reject) => {
    ytdl
      .getInfo(song.source)
      .then((info) => {
          try {
            if (
              fs.existsSync(fullPath)
            ) {
              resolve(true);
              return;
            }
          } catch (e) {
            reject(false);
            console.error(e);
          }
          ytdl(song.source, {
              filter: "audioonly",
            })
              .pipe(
                fs.createWriteStream(fullPath)
              )
              .on("finish", () => {
                const child = spawn("ffmpeg", [
                  "-y",
                  "-i",
                  `${fullPath}`,
                  "-af",
                  "loudnorm=I=-16:LRA=11:TP=-1.5",
                  `${fullPath.split(".mp3")[0]}.tmp.mp3`,
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
                  if (code === 0) {
                    fs.rename(
                      `${fullPath.split(".mp3")[0]}.tmp.mp3`,
                      `${fullPath}`,
                      (err) => {
                        if (err) {
                          reject(false);
                          console.log(err);
                        } else {
                          resolve(true);
                        }
                      }
                    );
                  } else {
                    reject(false);
                    console.error(code, "Failed converting: " + fullPath);
                  }
                });
              })
              .on("error", (e) => {
                console.error(e);
                reject(false);
              });
        }).catch((e) => {
            console.error(e);
          });
        });
}