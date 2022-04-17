import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, joinVoiceChannel, VoiceConnection, VoiceConnectionDisconnectedOtherState, VoiceConnectionDisconnectedState, VoiceConnectionDisconnectedWebSocketState, VoiceConnectionDisconnectReason, VoiceConnectionState, VoiceConnectionStatus } from "@discordjs/voice"
import { Client, CommandInteraction, GuildMember, Interaction, VoiceBasedChannel, VoiceChannel } from "discord.js"
import fs from "fs"
import Logger from "../../../Logger"
import ExtendedClient from "../ExtendedClient"
import Song, { SongType } from "./Song"
import SongQueue from "./SongQueue"

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
                this.debug("State:", newState.reason)
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
               this.skipTo(1);
               this.play();
            } else {
                this.debug("nothing to play, starting leave countdown")
                this.queue.queue = [];
                const timer = setTimeout(() => {
                    if(!this.isPlaying && this.queue.length === 0) {
                        this.connection.destroy();
                        client.mediaplayers.delete(channel.guild.id);
                    } else if(this.queue.length > 1) {
                        this.play()
                    }
                }, this.maxIdleTime);
            }
        })

        this.queue.on("push", () => {
            if(!this.isPlaying) {
                this.play();
            }
        })
    }

    add(source: string): Song {
        this.debug(source)
        const song = new Song(Song.parseType(source), source);
        this.debug(`Adding Song at:\n${song.source}\nType: ${Song.parseType(source)}`)
        this.queue.push(song);
        return song;
    }

    skipTo(index: number): Song | null {
        if(index > 0 && index < this.queue.length) {
            this.queue.splice(0, index);
            return this.play();
        }

        return null;
    }

    play(): Song | null {
        if(this.isPlaying) {
            this.debug("Already playing!")
            return this.queue.currentSong;
        }
        if(this.connection.state.status === 'ready') {
            this.isPlaying = true;
            this.debug("Queue-length: " + this.queue.length)
            this.debug(this.player.state.status)
            if(this.player.state.status === AudioPlayerStatus.Paused) {
                this.player.unpause();
            } else {
                this.player.play(this.queue.currentSong.resource);
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