import {
  ButtonInteraction,
  CommandInteraction,
  GuildMember,
  Message,
  ActionRowBuilder,
  SelectMenuBuilder,
  ButtonStyle,
  Permissions,
  SelectMenuInteraction,
  SlashCommandBuilder,
  VoiceChannel,
  CacheType,
  Interaction,
  ChatInputCommandInteraction,
  ActionRowComponent,
  PermissionsBitField,
  ButtonBuilder,
  MessagePayload,
  MessageActionRowComponentBuilder,
  EmbedBuilder,
} from "discord.js";
import Command from "../Command";
import fs from "fs";
import ExtendedClient from "../ExtendedClient";
import MediaPlayer from "../MediaPlayer/MediaPlayer";
import search from "youtube-search";
import Song, { SongType } from "../MediaPlayer/Song";
import SongQueue, { SongPosition } from "../MediaPlayer/SongQueue";
import LocalSongs from "../MediaPlayer/LocalSongs";
import { ytKey } from "../config.json";
import EventEmitter from "events";
import { Modifier } from "../MediaPlayer/SongQueueModifier";

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
              .addChoices(
                { name: 'Now', value: 'now' },
                { name: 'Next', value: 'next' },
                { name: 'End', value: 'end' },
              )
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
      cmd
      .setName("repeat")
      .setDescription("Toggles the repeating of current song")
      .addBooleanOption((option) =>
      option
        .setName("state")
        .setDescription("On or off (dont specify for toggle)")
        .setRequired(false)
        )
      
      )
      .addSubcommand((cmd) => 
      cmd
      .setName("loop")
      .setDescription("Toggles the repeating of whole playlist")
      .addBooleanOption((option) =>
      option
        .setName("state")
        .setDescription("On or off (dont specify for toggle)")
        .setRequired(false)
        )
      
      )
      .addSubcommand((cmd) => 
      cmd
      .setName("shuffle")
      .setDescription("Shuffle the playlist once!")
      )
      .addSubcommand((cmd) =>
        cmd.setName("current").setDescription("Displays currently playing song")
      )
      .addSubcommand((cmd) => 
        cmd.setName("clear").setDescription("Clears the current queue")
      )
      .addSubcommand((cmd) => 
      cmd
      .setName("del")
      .setDescription("Deletes current song from filesystem")
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
    interaction: ChatInputCommandInteraction
  ): Promise<boolean> {
    const func = interaction.options.getSubcommand();
    

    const member = interaction.member;
    if (!(member instanceof GuildMember))
      throw new Error("Member is not an instance of GuildMember!");

    const channel = member.voice.channel;

    let mediaplayer = client.mediaplayers.get(member.guild.id);
    let songquiz = client.songquizes.get(member.guild.id);

    if(songquiz && !songquiz.stopped) {
      await interaction.reply("Mediaplayer is locked while songquiz is active!")
      return true;
    }
    

    try {
      // only join if no connection exists and it actually requires a voice connection
      if (!mediaplayer) {
        // when there is no mediaplayer and it doesnt trigger a join
        // there's no point executing anything
        // if(!this.isJoinCommand(func)) {
        //   await interaction.reply("No active mediaplayer!")
        //   return false;
        // }

        // is user connected to a voicechannel?
        if(!(channel instanceof VoiceChannel)) {
          await interaction.reply("You are not connected to a voicechannel!");
          return false;
        }
        
        // mediaplayer = new MediaPlayer(client, interaction);
        // client.mediaplayers.set(member.guild.id, mediaplayer);
        // mediaplayer.interaction = interaction;
        
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
              case "next":
                pos = SongPosition.NEXT;
                break;
              default:
                pos = SongPosition.END;
                break;
            }
            if(!mediaplayer) {
              mediaplayer = this.createMediaplayer(client, member, interaction);
            }
            const song = mediaplayer.add(new Song(potentialType, target), pos);
            this.showSong(interaction, song, pos, mediaplayer);
            return true;
          }
          
          let localResults: Array<any> = [];
          LocalSongs.getSongs().forEach((song) => {
            if(localResults.length >= 5) return;
            if (song.toLowerCase().includes(target.toLowerCase())) {
              this.debug("LOCALRESULT:", song.replace(".mp3", ""))
              localResults.push({
                label: song.replace(".mp3", ""),
                description: "Local File",
                value: (song),
              });
            }
          });

          let onlineResults: Array<any> = [];


          await search(
            target,
            {
              maxResults: 5,
              key: ytKey,
              type: "video",
              videoCategoryId: "10" //music
            },
            async (err, results) => {
              if (err) {
                this.error("Unable to fetch YouTube-Videos: ", err);
              }
              if(!results) throw new Error("No YouTube-Videos found!")
              

              results.forEach((res) => {
                this.debug("ONLINERESULT:", res.title);
                onlineResults.push({
                  label: res.title.substring(0, 99),
                  description: res.channelTitle,
                  value: res.link,
                });
              });

              const components: Array<ActionRowBuilder<MessageActionRowComponentBuilder>> = []

              const rowLocal = new ActionRowBuilder<MessageActionRowComponentBuilder>()
              const rowOnline = new ActionRowBuilder<MessageActionRowComponentBuilder>()

              if(localResults.length > 0) {
                rowLocal.addComponents(
                  new SelectMenuBuilder()
                  .setCustomId("local")
                  .setPlaceholder("- Local Results -")
                  .addOptions(localResults)
                )

                components.push(rowLocal)
              }
              if(onlineResults.length > 0) {
                rowOnline.addComponents(
                  new SelectMenuBuilder()
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
                  if(!mediaplayer) {
                    mediaplayer = this.createMediaplayer(client, member, interaction)
                  }
                  const message = await selectInteraction.reply("adding");
                  await selectInteraction.deleteReply();

                  let song;
                  switch(selectInteraction.customId) {
                      case "online":
                          song = new Song(SongType.YOUTUBE, selectInteraction.values[0]);
                          break;
                      // primarily "local"
                      default:
                          song = new Song(SongType.FILE, selectInteraction.values[0]);
                          break;
                  }

                  let addedSong: Song;
                  let pos: SongPosition;

                  switch (position) {
                    // TODO: add thumbnails when adding videos!
                    case "now":
                      pos = SongPosition.NOW;
                      break;
                    case "next":
                      pos = SongPosition.NEXT;
                      break;
                    default:
                      this.debug("triggering default add to queue (adding to end)")
                      pos = SongPosition.END;
                  }

                  addedSong = mediaplayer.add(song, pos);
                  this.showSong(interaction, addedSong, pos, mediaplayer);
                }
              );
            }
          );

          return true;
        }
        case "skip": {
          //  TODO: refactor a lot
          if(!mediaplayer) {
            await interaction.reply("No mediaplayer active!");
            return false;
          }
          if(!mediaplayer.queue.currentSong) {
            await interaction.reply("No song to skip.");
            return false;
          }
          await interaction.deferReply();
          let amount = interaction.options.getNumber("amount");
          let position = interaction.options.getNumber("position");

          if(position === null || position <= 0) {
            position = 0;
          } else {
            // so user can use the same numbers that are shown in queue
            // indexing for user starts at 1
            position--;
          }

          if(!amount) {
            amount = 1;
          }

          if(amount <= 0) {
            await interaction.editReply("Negative or zero amount not possible!")
            return false;
          }

          if(position + amount > mediaplayer.queue.length) {
            await interaction.editReply("Skipping more songs than in queue not possible!\nTo clear queue use /mp clear!")
            return false;
          }

          let song: Song | null = null;

          if(position + amount === mediaplayer.queue.length) {
            this.debug("Clearing queue for related video fetching!")
            mediaplayer.clear();
            await interaction.editReply("Getting related video!");
          } else {
            this.debug("Trying to remove songs from:", position, "to", position+amount);
          
            song = mediaplayer.removeAt(position, amount);
            if(!song) {
              await interaction.editReply("Skipping not possible?")
              return false;
            }
  
            if(position === 0 && song) {
              this.showSong(interaction, song, SongPosition.NOW, mediaplayer);
            } else {
              await interaction.editReply("Skipped " + amount + " songs!");
            }
          }

          
          return true;
        }
        case "queue": {
          if(!mediaplayer) {
            await interaction.reply("No mediaplayer active!");
            return false;
          }
          const songs = mediaplayer.queue.queue
          let embed = new EmbedBuilder();
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

          let suffix = ""
          if(mediaplayer.modifiers.get(Modifier.LOOP)) suffix += "🔁";
          if(mediaplayer.modifiers.get(Modifier.REPEAT)) suffix+= "🔂";

          if (mediaplayer.queue.length >= 1) {
            this.debug("Queue:")
            if(suffix.length > 0) embed.addFields({
              name: suffix, value: "\u200B"
            })
            for(let i = 0; i < Math.min(5, songs.length); i++) {
              this.debug(i+1, await songs[i].name)
              embed.addFields({name:`${i+1}: ${await songs[i].name}`, value: "\u200B"});
            };
          } else {
            embed.addFields({
              name: "No songs in queue",
              value: "It looks pretty empty here, want to add something?"
          });
          }

          await interaction.reply({ embeds: [embed] });

          return true;
        }

        case "random": {
          const amount = interaction.options.getNumber("amount") || 1;

          if(amount < 1) {
            await interaction.reply("Invalid amount!");
            return false;
          } 

          if(!mediaplayer) {
            mediaplayer = this.createMediaplayer(client, member, interaction)
          }

          const songs = LocalSongs.randomSongs(amount)

          for(const file of songs) {
            const song = new Song(SongType.FILE, file);
            console.debug("TEST:",song.name)
            mediaplayer.add(song, SongPosition.END);
          };

          await interaction.reply("Added " + amount + " random songs to queue!")

          return true;
        }
        case "repeat": {
          await interaction.deferReply();
          if(!mediaplayer) {
            await interaction.editReply("No mediaplayer active!");
            return false;
          }

          let state = interaction.options.getBoolean("repeat");
          let setState = mediaplayer.modifiers.get(Modifier.REPEAT);
          if(setState === null) throw new Error("Invalid state in Mediaplayer!");

          if(state === null) {
            state = !setState;
          }
          
          mediaplayer.modifiers.set(Modifier.REPEAT, state);
          let text = "Repeating turned ";
          
          if(state) {
            text += "on!"
          } else {
            text += "off!"
          }

          await interaction.editReply(text)
          return true;
        }
        case "loop": {
          await interaction.deferReply();
          if(!mediaplayer) {
            await interaction.editReply("No mediaplayer active!");
            return false;
          }

          let state = interaction.options.getBoolean("loop");
          let setState = mediaplayer.modifiers.get(Modifier.LOOP);
          if(setState === null) throw new Error("Invalid state in Mediaplayer!");

          if(state === null) {
            state = !setState;
          }
          
          mediaplayer.modifiers.set(Modifier.LOOP, state);
          let text = "Looping turned ";
          
          if(state) {
            text += "on!"
          } else {
            text += "off!"
          }

          await interaction.editReply(text)
          return true;
        }
        case "shuffle": {
          if(!mediaplayer) {
            await interaction.reply("No mediaplayer active!");
            return false;
          }

          mediaplayer.queue.shuffle();

          await interaction.reply("Playlist shuffled!")
          return true;
        }
        case "current": {
          if(!mediaplayer) {
            await interaction.reply("No mediaplayer active!");
            return false;
          }
          await interaction.deferReply();
          const song = mediaplayer.queue.currentSong;
          
          if(song) {

            this.showSong(interaction, song, SongPosition.NOW, mediaplayer);
          } else {
            await interaction.editReply("Nothing to see here")
          }
          return true;
        }
        case "clear": {
          await interaction.deferReply();
          if(!mediaplayer) {
            await interaction.editReply("No mediaplayer active!")
            return false;
          }
          const temp = mediaplayer.removeAt(0, mediaplayer.queue.length);
          if(temp instanceof Song) {
            await interaction.editReply("Couldn't delete everything!")
            return false;
          } else {
            await interaction.editReply("Queue cleared!")
            return true;
          }
        }
        case "del": {
          await interaction.deferReply({ ephemeral: true });
          if(!mediaplayer) {
            await interaction.editReply("No mediaplayer active!")
            return false;
          }

          if(!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply("Insufficient permission!");
            return false;
          }
          const target = mediaplayer.queue.currentSong;
          if(target?.type === SongType.FILE) {
            const components: Array<ActionRowBuilder<MessageActionRowComponentBuilder>> = []

              const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
              .addComponents(
                [
                  new ButtonBuilder()
                .setCustomId("yes")
                .setLabel("👍")
                .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                .setCustomId("no")
                .setLabel("👎")
                .setStyle(ButtonStyle.Primary)
              ]
              )

              components.push(row)

              const payload = {
                content: `Are you sure you want to delete ${await target.name}?`,
                ephemeral: true,
                embeds: [],
                components
              }
              const message = await interaction.editReply(payload);

              if (!(message instanceof Message)) throw new Error("message is not a message!");

              const collector = message.createMessageComponentCollector({
                max: 1,
                time: 15000,
              });

              collector.on(
                "collect",
                async (button: ButtonInteraction) => {
                  
                  switch(button.customId) {
                    case "yes":
                      fs.rmSync("../../../../../Songs/"+target.source);
                      await button.reply({ content: 'Deleted!', ephemeral: true});
                      break;
                    default:
                      await button.reply({ content: 'Aborted!', ephemeral: true});
                      break;
                    }

                    if(mediaplayer?.queue.currentSong === target) {
                      this.debug("Skipping deleted song!")
                      mediaplayer.removeAt(0, 1);
                    }
                }
              );
            }
            break;
        }
        case "debug": {
          if(!mediaplayer) {
            await interaction.reply("No mediaplayer active");
            return false;
          } else {
            await interaction.reply("Trying to get unstuck.")
            mediaplayer.play(true);
            return true;
          }
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
  async showSong(interaction: CommandInteraction | SelectMenuInteraction, song: Song, position: SongPosition, mp: MediaPlayer) {
    const embed = new EmbedBuilder();

    switch(position) {
      case SongPosition.NOW: {
        embed.setDescription("Playing song:")
        break;
      }
      case SongPosition.NEXT: {
        embed.setDescription("Added upcoming song:")
      }
      default: {
        embed.setDescription("Added song to queue:")
      }
        
    }

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
          .addFields({name: "\u200B", value: `[${await song.name}](${song.source})`})
          .setImage(await song.thumbnail);
        break;
      }
      default: {
        embed
          .setAuthor({
            name: "📁 Local File",
          })
          .addFields({name: "\u200B", value: await song.name});
      }
    }

    if(mp.queue.nextSong) {
      embed.setFooter({
        text: "Coming up: " + await mp.queue.nextSong.name,
      });
    }

    const reply = await interaction.editReply({ embeds: [ embed ], components: [] })
    mp.messageHistory.set(reply.id, song);
  }

 /**
 * Checks if command triggers join
 * @param func Subcommand string to check
 * @returns boolean
 */
  createMediaplayer(client: ExtendedClient, member: GuildMember, interaction: CommandInteraction): MediaPlayer {
    const mediaplayer = new MediaPlayer(client, interaction);
    client.mediaplayers.set(member.guild.id, mediaplayer);
    mediaplayer.interaction = interaction;
    return mediaplayer;
  }
  // isJoinCommand(func: string): boolean {
  //   return ["add", "random"].includes(func);
  // }
}
