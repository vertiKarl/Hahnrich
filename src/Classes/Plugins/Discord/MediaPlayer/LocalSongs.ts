import fs from "fs";
import Logger from "../../../Logger";

/**
 * A class to handle interaction with the local filesystem
 */
export default class LocalSongs {
    /**
     * Fetches an array of randomly picked songs in the Songs folder
     * in the root directory of the project
     * @param amount The amount of songs to return
     * @returns An array songs with a length of the specified amount
     */
    static randomSongs(amount: number): Array<string> {
        const songs: Array<string> = []
        const allSongs = this.getSongs();

        if(allSongs.length < amount && allSongs.length <= amount / 3) return [];
        

        while(songs.length < amount) {
            const index = Math.floor(Math.random() * (allSongs.length -1));

            songs.push(allSongs[index]);

            // remove song from original array to avoid adding duplicates
            allSongs.splice(index, 1);
        }
        
        return songs;
    }

    /**
     * Converts it into utf-8, removes file extension,
     * replaces separator characters with spaces and
     * removes unnecessary whitespace
     * @param str The string to clean up
     * @returns 
     */
    static cleanString(str: string) {
        // converts it into utf8 represantion
        str = Buffer.from(str, 'utf-8').toString();

        // remove file extension from string
        const extension = /.{3}$/g;
        str = str.replaceAll(extension, "");

        // replace all characters that might get used as separators
        const separators = /([\_\-,.;:><\\\/\[\]\{\}\%\$\§\"\'\`\´\+\-\*])/g;
        str = str.replaceAll(separators, " ");

        // remove duplicate whitespace characters
        str = str.replaceAll(/\s+/g, " ");

        return str;
    }


    /**
     * Fetches all locally stored song-files
     * @returns An array of strings
     */
    static getSongs(): Array<string> {
        return fs.readdirSync(__dirname + "/../../../../../Songs/", {
            encoding: "utf-8"
        });
    }
}