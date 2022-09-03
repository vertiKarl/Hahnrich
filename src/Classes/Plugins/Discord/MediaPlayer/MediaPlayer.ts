import { AudioPlayer, AudioPlayerError, AudioPlayerStatus, AudioResource, createAudioPlayer, joinVoiceChannel, VoiceConnection, VoiceConnectionDisconnectedOtherState, VoiceConnectionDisconnectedState, VoiceConnectionDisconnectedWebSocketState, VoiceConnectionDisconnectReason, VoiceConnectionState, VoiceConnectionStatus } from "@discordjs/voice"
import { Client, CommandInteraction, GuildMember, Interaction, VoiceBasedChannel, VoiceChannel } from "discord.js"
import fs from "fs"
import Logger from "../../../Logger"
import ExtendedClient from "../ExtendedClient"
import { Modifier } from "./SongQueueModifier"
import Song, { SongType } from "./Song"
import SongQueue, { SongPosition } from "./SongQueue"
import { ytKey } from "../config.json";
import ytdl from "ytdl-core"
import search from "youtube-search"

export default class MediaPlayer extends Logger {
    queue = new SongQueue()
    player = createAudioPlayer()
    isPlaying = false
    emoji = "🎚"
    connection: VoiceConnection;
    channel: VoiceChannel;
    modifiers = new Map<Modifier, boolean>([
        [Modifier.REPEAT, false],
        [Modifier.LOOP, false]
    ]);
    messageHistory = new Map<string, Song>();
    songHistory: Array<Song> = [];

    readonly maxIdleTime: number = 5 * 60 * 1000 //  5 Minutes

    /**
     * A mediaplayer for controlling audio-playback in discord
     * @param client A client object for interacting with different discord guilds
     * @param interaction The interaction which triggered this mediaplayer
     */
    constructor(private client: ExtendedClient, public interaction: CommandInteraction) {
        super()

        const member = interaction.member;
        if(!(member instanceof GuildMember)) throw new Error("Member is not an instance of GuildMember!");

        const channel = member.voice.channel;
        if(!(channel instanceof VoiceChannel)) throw new Error("Member is not in a voicechannel!");
        
        this.channel = channel;

        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator
        })

        this.connection.on(VoiceConnectionStatus.Ready, () => {
            this.debug("VC Ready, connecting")
            this.connection.subscribe(this.player);
            if(!this.isPlaying) this.play();
        })

        this.connection.on(VoiceConnectionStatus.Disconnected, (
            oldState: VoiceConnectionState,
            newState: (VoiceConnectionDisconnectedOtherState & { status: VoiceConnectionStatus.Disconnected; }) | (VoiceConnectionDisconnectedWebSocketState)
            ) => {
                this.debug("Got disconnected reason:", newState.reason)
                switch(newState.reason) {
                    case VoiceConnectionDisconnectReason.WebSocketClose: {
                        this.connection.destroy()
                        client.mediaplayers.delete(channel.guild.id);
                        break;
                    }
                    case VoiceConnectionDisconnectReason.Manual: {
                        this.connection.destroy();
                        client.mediaplayers.delete(channel.guild.id);
                        break;
                    }
                    default: {
                        // reconnect
                        this.isPlaying = false;
                        this.player.pause();
                        this.connection.rejoin();
                        this.play();
                        break;
                    }
                }
            
        })

        // Auto timeout and disconnect
        this.player.on(AudioPlayerStatus.Idle, async () => {
            this.debug("Idle, trying to find next song")
            this.isPlaying = false;

            if(!this.connection) {
                client.mediaplayers.delete(channel.guild.id);
                return;
            }

            if(this.modifiers.get(Modifier.REPEAT)) {
                this.play(true);
                return;
            }

            if(this.queue.hasNext()) {
               this.debug("Has next, trying to play")
               // Next song!
               if(this.modifiers.get(Modifier.LOOP)) {
                this.queue.moveIndexToEnd(0);
                this.play(true);
               } else {
                   this.removeAt(0, 1);
                   this.play(true);
               }
            } else if(this.queue.currentSong?.type === SongType.YOUTUBE) {
                // Play related videos if queue is otherwise empty
                console.log("Related videos?", this.queue.currentSong.name)
                const data = (await ytdl.getInfo(this.queue.currentSong.path))
                const related = data.related_videos;
                const potentialNextVideos: Array<ytdl.relatedVideo> = [];
                related.forEach(video => {
                    if(video && video.length_seconds) {
                        if(video.length_seconds || video.length_seconds < 60*7) potentialNextVideos.push(video);
                    }
                })
                let duplicates: Array<string> = [];
                for(let j = 0; j < potentialNextVideos.length; j++) {
                    const video = potentialNextVideos[j];
                    const link = "https://youtube.com/watch?v="+video.id;
                    const info = await ytdl.getInfo(link);
                    if(info.videoDetails.category === "Music") {
                        const historyLength = this.songHistory.length;
                        let foundDuplicate = false;
                        if(historyLength > 0) {
                            for(let i = historyLength-1; i > Math.max(0, historyLength-5); i--) {
                                if(link === this.songHistory[i].source)  {
                                    this.debug("Song already recently played! Skipping.");
                                    foundDuplicate = true;
                                    duplicates.push(link)
                                    break;
                                }

                            }
                        }
                        if(!foundDuplicate) {
                            this.debug("adding related video to queue to avoid silence")
                            this.add(link, SongPosition.NOW);
                            return;
                        }
                    }
                }
                // did not find anything

                if(duplicates.length !== 0) {
                    this.debug("Only found duplicate, adding!");
                    this.add(duplicates[0], SongPosition.NOW);
                    return;
                }

                this.log("No duplicates found, trying search terms");

                // if no duplicates and no videos found
                // Random search terms
                const searchTerms = [
                    "Selphius", "Jinja", "Myun", "Shinaruhime", "EineLotta", "Ulrich Haus", "S3RL", "BLACKPINK", "Rammstein", "Terraria", "Minecraft",  "Portal",
                    "Celeste", "Undertale", "Deltarune", "Matstubs", "VTubers", "Hololive", "VSHOJO", "Cover", "Tomodachi Life", "EGAL", "Calliope Mori",
                    "Takanashi Kiara", "KIRA", "DETI RAVE", "vertiKarl", "1 2 Haferbrei",  "Alan Aztec", "Cepheid"
                ]
                const randomIndex = Math.floor(Math.random() * searchTerms.length);
                await search(searchTerms[randomIndex], {
                    maxResults: 5,
                    key: ytKey,
                    type: "video",
                    videoCategoryId: "10" //music
                }, async (err, results) => {
                    if (err) {
                      this.error("Unable to fetch YouTube-Videos: ", err);
                    }
                    if(!results) throw new Error("No YouTube-Videos found!")

                    const randomIndex = Math.floor(Math.random() * results.length);

                    const randomVideo = results[randomIndex];

                    this.add(randomVideo.link, SongPosition.NOW);
                })

            } else {
                this.debug("nothing to play, starting leave countdown")
                this.queue.queue = [];
                const timer = setTimeout(() => {
                    if(!this.isPlaying && this.queue.length === 0) {
                        this.connection.destroy();
                        client.mediaplayers.delete(channel.guild.id);
                    } else if(this.queue.length > 1) {
                        this.play(true)
                    }
                }, this.maxIdleTime);
            }
        })

        this.player.on('error', (error: AudioPlayerError) => {
            console.error(`Error: ${error.message} with resource ${error.resource instanceof AudioResource ? error.resource : "unknown"}`);
            if(!this.removeAt(0, 1)) {
                this.debug("No more to play, returning to idle state")
                this.clear();
            }
        });

        this.queue.on("push", () => {
            this.debug("Pushed something, starting this.play()")
            if(!this.isPlaying) this.play();
        })

        this.queue.on("SongChange", () => {
            this.debug("Triggering refresh")
            this.play(true);
        })
    } 

    /**
     * Adds a given song to a specified position in this.queue
     * @param source Either a string to parse or a given song to add to this.queue
     * @param position The position to which the given song gets added in this.queue
     * @returns Either the parsed song or the input song
     */
    add(source: string | Song, position: SongPosition): Song {
        let song: Song;

        if(source instanceof Song) {
            song = source;
        } else {
            song = new Song(Song.parseType(source), source);
        }

        (async () => {
            this.debug(`Adding ${await song.name} at:\n${position}\nType: ${song.type}\nFrom: ${song.source}`)
        })()

        this.queue.pushToPosition(song, position)

        return song;
    }

    /**
     * Removes a given range of songs from this.queue and automatically plays the new current first song in this.queue
     * if it changed
     * @param index Starting index to remove songs from
     * @param amount Amount of songs to remove
     * @returns The now playing song or null if there is either nothing to play or the first element didn't get removed
     */
    removeAt(index: number, amount: number): Song | null {
        this.debug("Trying to remove", amount, "songs at", index);
        if(index >= 0 && index < this.queue.length && index + amount < this.queue.length && amount > 0) {
            this.queue.splice(index, amount);
            return this.play(index === 0);
        }

        return null;
    }


    /**
     * Plays the this.queue.currentSong resource on this.connection
     * @param force [Optional] Ignores checks for already playing
     * @returns The playing song or null if there is nothing to play
     */
    play(force = false): Song | null {
        if(!this.queue.currentSong) {
            this.debug("No song to play")
            return null;
        }
        this.debug("isPlaying:", this.isPlaying);
        if(!force && this.isPlaying) {
            this.debug("Already playing!")
            return this.queue.currentSong;
        }
        this.debug("Ready?", this.connection.state.status === 'ready')
        if(this.connection.state.status === 'ready') {
            
            this.debug("Queue-length: " + this.queue.length)
            this.debug(this.player.state.status)
            this.debug("TYPE:", this.queue.currentSong?.type);
            if(!force  && this.player.state.status === AudioPlayerStatus.Paused) {
                this.debug("trying to unpause")
                this.isPlaying = true;
                this.player.unpause();
                return this.queue.currentSong;
            } else if(!force && this.player.state.status === AudioPlayerStatus.AutoPaused) {
                this.debug("auto paused! trying to unpause!")
                this.isPlaying = true;
                this.player.unpause();
                return this.queue.currentSong;
            } else {
                this.debug("trying to play")
                try {
                    // only if there is a song in queue
                    this.debug("Am able to play?", !!this.queue.currentSong);
                    if(this.queue.currentSong) {
                        this.isPlaying = true;
                        this.player.play(this.queue.currentSong.resource);
                    }
                } catch(err) {
                    this.error(err);
                    this.isPlaying = false;
                    if(this.connection && this.queue.currentSong) {
                        this.play()
                    }
                }
            }

            this.songHistory.push(this.queue.currentSong);
            
            return this.queue.currentSong;
        } else {

            // setTimeout(() => {
            //     this.debug("delaying play (waiting for connection)")
            //     this.play(true);
            // }, 1000)
            this.debug("Connection not ready!")
        }
        return null;
    }

    /**
     * Destroys the mediaplayer and removes it from the client map and
     * prepares it to get taken by garbage collection
     */
    stop(): void {
        this.connection.destroy();
        this.client.mediaplayers.delete(this.channel.guild.id);
    }

    clear(): void {
        this.player.stop(true)
    }

    changeChannel(channel: VoiceChannel): void {
        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator
        })
    }

    
}