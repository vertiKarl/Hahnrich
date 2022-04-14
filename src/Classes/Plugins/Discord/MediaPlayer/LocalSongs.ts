import fs from "fs";
import Logger from "../../../Logger";

export default class LocalSongs extends Logger {

    emoji = "📁"

    static randomSongs(amount: number): Array<string> {
        const songs: Array<string> = []
        const allSongs = this.getSongs();

        if(allSongs.length < amount && allSongs.length <= amount / 3) return [];
        

        while(songs.length < amount) {
            console.log("Adding song?")
            songs.push(allSongs[Math.floor(Math.random() * (allSongs.length -1))])
        }
        
        return songs;
    }

    static getSongs(): Array<string> {
        return fs.readdirSync(__dirname + "/../../../../../Songs/", {
            encoding: "utf-8"
        });
    }
}