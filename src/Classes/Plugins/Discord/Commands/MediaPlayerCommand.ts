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
import LocalSongs from "../MediaPlayer/LocalSongs";
import { ytKey } from "../config.json";
import Logger from "../../../Logger";
import EventEmitter from "events";

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
              .addChoice("End of queue", "end")
              .addChoice("Start of queue", "start")
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
      );
  }

  async execute(
    client: ExtendedClient,
    interaction: CommandInteraction,
    events: EventEmitter
  ): Promise<boolean> {
    const func = interaction.options.getSubcommand();

    Logger.isDebug = true;
    
    this.debug("Starting mp command!")

    const member = interaction.member;
    if (!(member instanceof GuildMember))
      throw new Error("Member is not an instance of GuildMember!");

    const channel = member.voice.channel;

    let mediaplayer = client.mediaplayers.get(member.guild.id);
    

    try {
      if (!mediaplayer) {
        if(!(channel instanceof VoiceChannel)) throw new Error("No Mediaplayer!");
        mediaplayer = new MediaPlayer(client, interaction);
        client.mediaplayers.set(member.guild.id, mediaplayer);
      } else if (channel instanceof VoiceChannel && mediaplayer.channel !== channel) {
        mediaplayer.changeChannel(channel);
      }

      mediaplayer.interaction = interaction;

      this.debug("Got mediaplayer!")

      switch (func) {
        case "add": {
          await interaction.deferReply();

          let target = interaction.options.getString("target") || "";
          const position = interaction.options.getString("position");
          if (!target) throw new Error("No target for add command");
          
          let localResults: Array<MessageSelectOptionData> = [];
          LocalSongs.getSongs().forEach((song) => {
            if (song.includes(target)) {
              localResults.push({
                label: song.replace(".mp3", ""),
                description: "Local File",
                value: (__dirname + "../MediaPlayer/Songs/" + song),
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
              const row = new MessageActionRow()

              if(localResults.length > 0) {
                row.addComponents(
                  new MessageSelectMenu()
                  .setCustomId("local")
                  .setPlaceholder("- Local Results -")
                  .addOptions(localResults)
                )
              }
              if(onlineResults.length > 0) {
                row.addComponents(
                  new MessageSelectMenu()
                  .setCustomId("online")
                  .setPlaceholder("- Online Results - ")
                  .addOptions(onlineResults)
                )
              }

              this.debug(`Results:\nOnline:${onlineResults.length}\nLocal:${localResults.length}`)
              if(onlineResults.length === 0 && localResults.length === 0) throw new Error("No results!")
              const message = await interaction.editReply({components: [row]});

              if (!(message instanceof Message)) throw new Error("message is not a message!");

              const collector = message.createMessageComponentCollector({
                max: 1,
                time: 5000,
              });

              collector.on(
                "collect",
                async (selectInteraction: SelectMenuInteraction) => {
                  if(!mediaplayer) throw new Error("No mediaplayer found :(");
                  await selectInteraction.deferReply();
                  let song;

                  // TODO:
                  // Might want to switch to the beneath implementation for optimization!
                  // this reduces the number of parses needed to figure out SongType

                  // switch(selectInteraction.customId) {
                  //     case "online":
                  //         song = new Song(SongType.YOUTUBE, selectInteraction.values[0]);
                  //         break;
                  //     case "local":
                  //         song = new Song(SongType.FILE, selectInteraction.values[0]);
                  //         break;
                  // }

                  let addedSong: Song;

                  switch (position) {
                    // TODO: add thumbnails when adding videos!
                    case "start":
                      // TODO: add via unshift
                      addedSong = mediaplayer.add(selectInteraction.values[0]);
                      mediaplayer.skipTo(1);
                      break;
                    default:
                      addedSong = mediaplayer.add(selectInteraction.values[0]);
                  }

                  this.showSong(selectInteraction, addedSong);
                }
              );
            }
          );

          return true;
        }
        case "skip": {
          await interaction.deferReply();
          const amount = interaction.options.getNumber("amount") || 1;
          const song = mediaplayer.skipTo(amount);

          

          if(!song) return false;

          const nextSong = mediaplayer.queue.nextSong;

          this.showSong(interaction, song, nextSong);
        }
        case "queue": {
          let embed = new MessageEmbed();
          embed
            .setColor("#02f3f3")
            .setTitle("Queue:")
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
            let i = 1;
            const songs = mediaplayer.queue.queue
            for(const song of songs) {
              embed.addField(`${i}: ${await song.name}`, "\u200B");
              i++;
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
            this.debug("Song", song)
            mediaplayer?.add(song);
          });

          interaction.reply("Added " + amount + " random songs to queue!")

          return true;
        }
        case "current": {
          await interaction.deferReply();
          const song = mediaplayer.queue.currentSong;
          const nextSong = mediaplayer.queue.nextSong;
          
          this.showSong(interaction, song, nextSong);

          break;
        }
      }
    } catch (error) {
      this.error(error);
      return false;
    }

    return true;
  }

  async showSong(interaction: CommandInteraction | SelectMenuInteraction, song: Song, next?: Song | null) {
    const embed = new MessageEmbed();

    switch (song.type) {
      case SongType.YOUTUBE: {
        const artist = await song.artist;
        this.debug(artist.name)
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
            name: "Local File",
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

  async stop(): Promise<boolean> {
    return true;
  }
}
