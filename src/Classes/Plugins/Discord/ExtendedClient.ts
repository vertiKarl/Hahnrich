import { Client } from "discord.js";
import MediaPlayer from "./MediaPlayer/MediaPlayer";

export default class ExtendedClient extends Client {
    mediaplayers = new Map<string, MediaPlayer>();
}