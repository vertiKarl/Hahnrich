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

    static cleanString(str: string) {
        // remove file extension from string
        const extension = /.{3}$/g;
        str = str.replaceAll(extension, "");

        // replace all characters that might get used as seperators
        const seperators = /([\_\-,.;:><\\\/\[\]\{\}\%\$\§\"\'\`\´\+\-\*])/g;
        str = str.replaceAll(seperators, " ");

        // remove all non printable characters
        const mainPass = /([^\w0-9 _-])/g;
        str = str.replaceAll(mainPass, "");

        // remove duplicate whitespace characters
        str = str.replaceAll(/\s+/g, " ");

        return str;
    }

    static getSongs(): Array<string> {
        return fs.readdirSync(__dirname + "/../../../../../Songs/", {
            encoding: "utf-8"
        });
    }
}