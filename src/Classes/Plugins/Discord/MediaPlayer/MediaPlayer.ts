import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, joinVoiceChannel, VoiceConnection, VoiceConnectionDisconnectedOtherState, VoiceConnectionDisconnectedState, VoiceConnectionDisconnectedWebSocketState, VoiceConnectionDisconnectReason, VoiceConnectionState, VoiceConnectionStatus } from "@discordjs/voice"
import { Client, CommandInteraction, GuildMember, Interaction, VoiceBasedChannel, VoiceChannel } from "discord.js"
import fs from "fs"
import Logger from "../../../Logger"
import ExtendedClient from "../ExtendedClient"
import Song, { SongType } from "./Song"
import SongQueue, { SongPosition } from "./SongQueue"

export default class MediaPlayer extends Logger {
    queue = new SongQueue()
    player = createAudioPlayer()
    isPlaying = false
    emoji = "🎚"
    connection: VoiceConnection;
    channel: VoiceChannel;
    readonly maxIdleTime: number = 5 * 60 * 1000 //  5 Minutes

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
            this.connection.subscribe(this.player);
            if(!this.isPlaying && this.queue.hasNext()) this.play();
        })

        this.connection.on(VoiceConnectionStatus.Disconnected, (
            oldState: VoiceConnectionState,
            newState: (VoiceConnectionDisconnectedOtherState & { status: VoiceConnectionStatus.Disconnected; }) | (VoiceConnectionDisconnectedWebSocketState)
            ) => {
                this.debug("Got disconnected reason:", newState.reason)
                switch(newState.reason) {
                    case VoiceConnectionDisconnectReason.EndpointRemoved: {
                        this.connection.destroy();
                        client.mediaplayers.delete(channel.guild.id);
                        break;
                    }
                    case VoiceConnectionDisconnectReason.Manual: {
                        this.connection.destroy();
                        client.mediaplayers.delete(channel.guild.id);
                        break;
                    }
                    case VoiceConnectionDisconnectReason.WebSocketClose: {
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
        this.player.on(AudioPlayerStatus.Idle, () => {
            this.debug("Idle, trying to find next song")
            this.isPlaying = false;

            if(!this.connection) {
                client.mediaplayers.delete(channel.guild.id);
                return;
            }

            if(this.queue.hasNext()) {
               this.debug("Has next, trying to play")
               // Next song!
               this.removeAt(0, 1);
               this.play(true);
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

        this.queue.on("push", () => {
            this.debug("Pushed something, startin this.play()")
            this.play();
        })

        this.queue.on("SongChange", () => {
            this.debug("Triggering refresh")
            this.play(true);
        })
    }

    add(source: string | Song, position: SongPosition): Song {
        let song: Song;

        if(source instanceof Song) {
            song = source;
        } else {
            song = new Song(Song.parseType(source), source);
        }

        (async () => {
            this.debug(`Adding ${await song.name} at:\n${position}\nType: ${song.type}`)
        })()

        this.queue.pushToPosition(song, position)
        return song;
    }

    removeAt(index: number, amount: number): Song | null {
        if(index >= 0 && index < this.queue.length && index + amount < this.queue.length && amount > 0) {
            this.queue.splice(index, amount);
            return this.play(index === 0);
        }

        return null;
    }

    play(force = false): Song | null {
        if(!force && this.isPlaying) {
            this.debug("Already playing!")
            return this.queue.currentSong;
        }
        if(this.connection.state.status === 'ready') {
            this.isPlaying = true;
            this.debug("Queue-length: " + this.queue.length)
            this.debug(this.player.state.status)
            if(this.player.state.status === AudioPlayerStatus.Paused) {
                this.debug("trying to unpause")
                this.player.unpause();
            } else {
                this.debug("trying to play")
                try {
                    this.player.play(this.queue.currentSong.resource);
                } catch(err) {
                    this.error(err);
                    this.isPlaying = false;
                    if(this.connection) {
                        this.play()
                    }
                }
            }
            
            return this.queue.currentSong;
        } else {
            this.debug("Connection not ready!")
        }
        return null;
    }

    changeChannel(channel: VoiceChannel): void {
        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator
        })
    }

    
}