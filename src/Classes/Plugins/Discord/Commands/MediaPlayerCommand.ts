import { SlashCommandBuilder } from "@discordjs/builders";
import {
  Client,
  CommandInteraction,
  GuildMember,
  Interaction,
  Message,
  MessageActionRow,
  MessageEmbed,
  MessageSelectMenu,
  MessageSelectOptionData,
  SelectMenuInteraction,
  VoiceChannel,
} from "discord.js";
import Command from "../Command";
import ExtendedClient from "../ExtendedClient";
import MediaPlayer from "../MediaPlayer/MediaPlayer";
import search from "youtube-search";
import Song, { SongType } from "../MediaPlayer/Song";
import { SongPosition } from "../MediaPlayer/SongQueue";
import LocalSongs from "../MediaPlayer/LocalSongs";
import { ytKey } from "../config.json";
import EventEmitter from "events";

/**
 * A command which interacts with MediaPlayer, to play audio in a Discord-VoiceChannel
 */
export default class MediaPlayerCommand extends Command {
  data = new SlashCommandBuilder();

  permissions = [];

  constructor() {
    super();

    this.data
      .setName("mp")
      .setDescription("MediaPlayer controls")
      .addSubcommand((cmd) =>
        cmd
          .setName("add")
          .setDescription("Add song to queue via Name or URL!")
          .addStringOption((option) =>
            option
              .setName("target")
              .setDescription("Name or URL of song")
              .setRequired(true)
          )
          .addStringOption((position) =>
            position
              .setName("position")
              .setDescription("Add song to:")
              .addChoice("Now", "now")
              .addChoice("Next", "next")
              .addChoice("End", "end")
              .setRequired(false)
          )
      )
      .addSubcommand((cmd) =>
        cmd
          .setName("skip")
          .setDescription("Skips specified amount of songs in queue")
          .addNumberOption((option) =>
            option.setName("amount").setDescription("Amount of songs to skip")
          )
          .addNumberOption((option) => 
            option.setName("position").setDescription("Skip song at specific position")
          )
      )
      .addSubcommand((cmd) =>
        cmd.setName("queue").setDescription("Shows current queue")
      )
      .addSubcommand((cmd) =>
        cmd
          .setName("random")
          .setDescription("Adds random songs to queue")
          .addNumberOption((option) =>
            option.setName("amount").setDescription("Amount of songs to add")
          )
      )
      .addSubcommand((cmd) =>
        cmd.setName("current").setDescription("Displays currently playing song")
      )
      .addSubcommand((cmd) => 
        cmd.setName("clear").setDescription("Clears the current queue")
      )
      .addSubcommand((cmd) => 
        cmd.setName("debug")
        .setDescription("If Hahnrich got stuck")
      );
  }

  /**
   * @param client The client of the DiscordPlugin
   * @param interaction The interaction which triggered this command
   * @returns true on success and false on error
   */
  async execute(
    client: ExtendedClient,
    interaction: CommandInteraction
  ): Promise<boolean> {
    const func = interaction.options.getSubcommand();
    

    const member = interaction.member;
    if (!(member instanceof GuildMember))
      throw new Error("Member is not an instance of GuildMember!");

    const channel = member.voice.channel;

    let mediaplayer = client.mediaplayers.get(member.guild.id);
    let songquiz = client.songquizes.get(member.guild.id);

    if(songquiz && !songquiz.stopped) {
      interaction.reply("Mediaplayer is locked while songquiz is active!")
      return true;
    }
    

    try {
      // only join if no connection exists and it actually requires a voice connection
      if (!mediaplayer) {
        // when there is no mediaplayer and it doesnt trigger a join
        // there's no point executing anything
        if(!this.isJoinCommand(func)) {
          interaction.reply("No active mediaplayer!")
          return false;
        }

        // is user connected to a voicechannel?
        if(!(channel instanceof VoiceChannel)) {
          interaction.reply("You are not connected to a voicechannel!");
          return false;
        }
        
        mediaplayer = new MediaPlayer(client, interaction);
        client.mediaplayers.set(member.guild.id, mediaplayer);
        mediaplayer.interaction = interaction;
        
      } else if (channel instanceof VoiceChannel && mediaplayer.channel !== channel) {
        mediaplayer.changeChannel(channel);
        mediaplayer.interaction = interaction;
      }


      switch (func) {
        case "add": {
          await interaction.deferReply();

          let target = interaction.options.getString("target") || "";
          const position = interaction.options.getString("position");
          if (!target) throw new Error("No target for add command");

          const potentialType = Song.parseType(target);
          if(potentialType === SongType.YOUTUBE) {
            let pos: SongPosition;
            switch(position) {
              case "now":
                pos = SongPosition.NOW;
                break;
              case "nex":
                pos = SongPosition.NEXT;
                break;
              default:
                pos = SongPosition.END;
                break;
            }
            const song = mediaplayer.add(new Song(potentialType, target), pos);
            this.showSong(interaction, song);
            return true;
          }
          
          let localResults: Array<MessageSelectOptionData> = [];
          LocalSongs.getSongs().forEach((song) => {
            if(localResults.length >= 5) return;
            if (song.toLowerCase().includes(target.toLowerCase())) {
              localResults.push({
                label: song.replace(".mp3", ""),
                description: "Local File",
                value: (song),
              });
            }
          });

          let onlineResults: Array<MessageSelectOptionData> = [];


          await search(
            target,
            {
              maxResults: 5,
              key: ytKey,
              type: "video",
            },
            async (err, results) => {
              if (err) {
                this.error("Unable to fetch YouTube-Videos: ", err);
              }
              if(!results) throw new Error("No YouTube-Videos found!")
              

              results.forEach((res) => {
                onlineResults.push({
                  label: res.title,
                  description: res.channelTitle,
                  value: res.link,
                });
              });

              const components = []

              const rowLocal = new MessageActionRow()
              const rowOnline = new MessageActionRow()

              if(localResults.length > 0) {
                rowLocal.addComponents(
                  new MessageSelectMenu()
                  .setCustomId("local")
                  .setPlaceholder("- Local Results -")
                  .addOptions(localResults)
                )

                components.push(rowLocal)
              }
              if(onlineResults.length > 0) {
                rowOnline.addComponents(
                  new MessageSelectMenu()
                  .setCustomId("online")
                  .setPlaceholder("- Online Results - ")
                  .addOptions(onlineResults)
                )

                components.push(rowOnline)
              }

              this.debug(`Results:\nOnline:${onlineResults.length}\nLocal:${localResults.length}`)
              if(onlineResults.length === 0 && localResults.length === 0) throw new Error("No results!")
              const message = await interaction.editReply({components});

              if (!(message instanceof Message)) throw new Error("message is not a message!");

              const collector = message.createMessageComponentCollector({
                max: 1,
                time: 15000,
              });

              collector.on(
                "collect",
                async (selectInteraction: SelectMenuInteraction) => {
                  if(!mediaplayer) throw new Error("No mediaplayer found :(");
                  await selectInteraction.deferReply();

                  let song;
                  switch(selectInteraction.customId) {
                      case "online":
                          song = new Song(SongType.YOUTUBE, selectInteraction.values[0]);
                          break;
                      // primarly "local"
                      default:
                          song = new Song(SongType.FILE, selectInteraction.values[0]);
                          break;
                  }

                  let addedSong: Song;


                  switch (position) {
                    // TODO: add thumbnails when adding videos!
                    case "now":
                      addedSong = mediaplayer.add(song, SongPosition.NOW);
                      break;
                    case "next":
                      addedSong = mediaplayer.add(song, SongPosition.NEXT);
                      break;
                    default:
                      this.debug("triggering default add to queue (adding to end)")
                      addedSong = mediaplayer.add(song, SongPosition.END);
                  }

                  this.showSong(selectInteraction, addedSong);

                  try {
                    await message.delete();
                  } catch(err) {
                    this.error("Couldn't delete message", err);
                  }
                }
              );
              
                // clean up
              collector.on("end", async () => {
                if(!message || !message.deletable) return;
                try {
                  await message.delete();
                } catch(err) {
                  this.error("Couldn't delete message", err);
                }
              })
            }
          );

          return true;
        }
        case "skip": {
          await interaction.deferReply();
          const amount = interaction.options.getNumber("amount") || 1;
          let position = interaction.options.getNumber("position");

          if(position === null || position <= 0) {
            position = 0;
          } else {
            // so user can use the same numbers that are shown in queue
            // indexing for user starts at 1
            position--;
          }

          this.debug("Trying to remove songs from:", position, "to", position+amount);
          
          const song = mediaplayer.removeAt(position, amount);

          

          if(!song) {
            interaction.editReply("Skipping not possible, did you specify a negative amount?")
            return false;
          }

          const nextSong = mediaplayer.queue.nextSong;

          this.showSong(interaction, song, nextSong);
          return true;
        }
        case "queue": {
          const songs = mediaplayer.queue.queue
          let embed = new MessageEmbed();
          embed
            .setColor("#02f3f3")
            .setTitle(`Queue[${songs.length}]:`)
            .setURL(
              "https://zap-hosting.com/de/shop/donation/b46e5e7b07106dad59febaf3b66fd5e5/"
            )
            .setAuthor({
              name: "Hahnrich",
              iconURL:
                client.user?.avatarURL() ||
                "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/cb/cb9a41873f2065b8010afa7584803d283dd7e6ad_full.jpg",
              url: "https://karlology.eu",
            });

          if (mediaplayer.queue.length >= 1) {
            this.debug("Queue:")
            for(let i = 0; i < Math.min(5, songs.length); i++) {
              this.debug(i+1, songs[i].name)
              embed.addField(`${i+1}: ${await songs[i].name}`, "\u200B");
            };
          } else {
            embed.addField(
              "No songs in queue",
              "It looks pretty empty here, want to add something?"
            );
          }

          interaction.reply({ embeds: [embed] });

          return true;
        }

        case "random": {
          const amount = interaction.options.getNumber("amount") || 1;
          LocalSongs.randomSongs(amount).forEach((song) => {
            mediaplayer?.add(song, SongPosition.END);
          });

          interaction.reply("Added " + amount + " random songs to queue!")

          return true;
        }
        case "current": {
          await interaction.deferReply();
          const song = mediaplayer.queue.currentSong;
          const nextSong = mediaplayer.queue.nextSong;
          
          if(song) {

            this.showSong(interaction, song, nextSong);
          } else {
            interaction.editReply("Nothing to see here")
          }
          return true;
          break;
        }
        case "clear": {
          await interaction.deferReply();
          const temp = mediaplayer.removeAt(0, mediaplayer.queue.length);
          if(temp instanceof Song) {
            interaction.editReply("Couldn't delete everything!")
            return false;
          } else {
            interaction.editReply("Queue cleared!")
            return true;
          }
        }
        case "debug": {
          mediaplayer.play(true);
          return true;
        }
      }
    } catch (error) {
      this.error(error);
      return false;
    }

    return true;
  }

  /**
   * Edits the reply to the given interaction with an embed of
   * the given song
   * @param interaction The interaction that triggered this command
   * @param song The song to display
   * @param next [Optional] The upcoming song
   */
  async showSong(interaction: CommandInteraction | SelectMenuInteraction, song: Song, next?: Song | null) {
    const embed = new MessageEmbed();

    switch (song.type) {
      case SongType.YOUTUBE: {
        const artist = await song.artist;
        const thumbnails = artist.thumbnails;
        if (!thumbnails)
          throw new Error("Current artist has no thumbnails!");

        embed
          .setAuthor({
            name: artist.name,
            iconURL: thumbnails[thumbnails.length - 1].url,
            url: artist.channel_url,
          })
          .addField("\u200B", `[${await song.name}](${song.source})`)
          .setImage(await song.thumbnail);
        break;
      }
      default: {
        embed
          .setAuthor({
            name: "📁 Local File",
          })
          .addField("\u200B", await song.name);
      }
    }

    if(next) {
      embed.setFooter({
        text: "Coming up: " + await next.name,
      });
    }

    interaction.editReply({ embeds: [ embed ] })
  }

 /**
 * Checks if command triggers join
 * @param func Subcommand string to check
 * @returns boolean
 */
  isJoinCommand(func: string): boolean {
    return ["add", "random"].includes(func);
  }
}
