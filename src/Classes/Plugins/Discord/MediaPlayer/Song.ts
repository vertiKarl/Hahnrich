import { AudioResource, createAudioResource } from "@discordjs/voice";
import ytdl, { Author } from "ytdl-core";
import Logger from "../../../Logger";
import LocalSongs from "./LocalSongs";
//import { parseFile } from 'music-metadata';

export enum SongType {
    YOUTUBE, FILE, EMBED
}

export default class Song extends Logger {
    emoji = "🎵";
    readonly resource: AudioResource;

    constructor(readonly type: SongType, readonly source: string) {
        super()
        this.resource = this.generateResource();
    }

    get length(): Promise<number> {
        switch(this.type) {
            case SongType.YOUTUBE: {
                return (async () => {
                    return parseInt((await ytdl.getInfo(this.source)).videoDetails.lengthSeconds)
                })()
            }
            case SongType.FILE: {
                return (async () => {
                    // TODO: music-metadata uses require() which is not supported
                    return -1
                    // const metadata = await parseFile(this.source, { duration: true })
                    // return metadata?.format?.duration === undefined ? -1 : metadata.format.duration;
                })()
            }
            case SongType.EMBED: {
                return (async () => {
                    // not implemented
                    return -1;
                })()
            }
        }
    }
    
    generateResource(): AudioResource {
        switch(this.type) {
            case SongType.FILE:
                this.debug(__dirname + "/../../../../../Songs/" + this.source)
                return createAudioResource(__dirname + "/../../../../../Songs/" + this.source);
            case SongType.YOUTUBE:
                return createAudioResource(ytdl(this.source, {
                    filter: "audioonly"
                }))
            case SongType.EMBED:
                // TODO: implement handling for discord embeds
                return createAudioResource("");
                //return createAudioResource(got.stream(this.source))
        }
    }

    get path(): string {
        switch(this.type) {
            case SongType.FILE:
                return __dirname + "/../../../../../Songs/" + this.source
            case SongType.YOUTUBE:
                return this.source;
            case SongType.EMBED:
                // TODO: implement handling for discord embeds
                return "";
        }
    }

    get name(): Promise<string> {
        switch(this.type) {
            case SongType.YOUTUBE:
                return (async () => {
                    return (await ytdl.getInfo(this.source)).videoDetails.title
                })()
                break;
            case SongType.FILE:
                return new Promise((resolve) => {
                    resolve(LocalSongs.cleanString(this.source));
                })
            case SongType.EMBED:
                return new Promise((resolve) => {
                    resolve("Placeholder");
                })
        }
    }

    get thumbnail(): Promise<string> {
        switch(this.type) {
            case SongType.YOUTUBE:
                return (async () => {
                    const thumbnails = (await ytdl.getInfo(this.source)).videoDetails.thumbnails;
                    return thumbnails[thumbnails.length - 1].url
                })()
                break;
            case SongType.FILE:
                return new Promise((resolve) => {
                    resolve("");
                })
            case SongType.EMBED:
                return new Promise((resolve) => {
                    resolve("");
                })
        }
    }

    get artist(): Promise<Author> {
        switch(this.type) {
            case SongType.YOUTUBE:
                return (async () => {
                    return (await ytdl.getInfo(this.source)).videoDetails.author;
                })();
            case SongType.FILE:
                return new Promise((resolve) => {
                    resolve({
                        id: "",
                        name: "unknown",
                        avatar: "",
                        verified: false,
                        channel_url: ""
                      })
                })
            case SongType.EMBED:
                return new Promise((resolve) => {
                    resolve({
                        id: "",
                        name: "unknown",
                        avatar: "",
                        verified: false,
                        channel_url: ""
                    })
                })
        }
    }

    /**
     * Parses a given string to either be of type YouTube, Embed or File
     * @param source String to parse
     * @returns The SongType of a given source
     */
    static parseType(source: String): SongType {
        if(
            source.startsWith("https://youtube.com/watch") ||
            source.startsWith("https://www.youtube.com/watch") ||
            source.startsWith("https://youtu.be/") ||
            source.startsWith("https://m.youtube.com/watch")
        ) {
            return SongType.YOUTUBE
        } else if(source.startsWith("https://cdn.discordapp.com/attachments/")) {
            return SongType.EMBED
        } else {
            return SongType.FILE
        }
    }
}