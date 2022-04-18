import { Client } from "discord.js";
import MediaPlayer from "./MediaPlayer/MediaPlayer";
import Quiz from "./SongQuiz/Quiz";

export default class ExtendedClient extends Client {
    mediaplayers = new Map<string, MediaPlayer>();
    songquizes = new Map<string, Quiz>();
}