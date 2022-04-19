import { Client } from "discord.js";
import MediaPlayer from "./MediaPlayer/MediaPlayer";
import Quiz from "./SongQuiz/Quiz";

/**
 * A sub-class for discord.js Client class to provide
 * global access to all active mediaplayers and songquizes
 */
export default class ExtendedClient extends Client {
    mediaplayers = new Map<string, MediaPlayer>();
    songquizes = new Map<string, Quiz>();
}