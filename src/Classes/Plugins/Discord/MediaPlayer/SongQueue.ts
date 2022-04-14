import EventEmitter from "events";
import Song from "./Song";

/**
 * A wrapper class for an array object
 */
export default class SongQueue extends EventEmitter {
    public queue: Array<Song> = []

    constructor() {
        super()
    }

    get currentSong() {
        return this.queue[0];
    }

    get nextSong(): Song | null {
        if(this.queue.length > 1) {
            return this.queue[1]
        } else {
            return null
        };
    }

    get length() {
        return this.queue.length;
    }

    hasNext(): boolean {
        return this.queue.length > 1;
    }

    push(song: Song) {
        this.queue.push(song);
        this.emit("push");
    }

    unshift(song: Song) {
        this.emit("unshift");
        this.queue[0] = song;
    }

    splice(from: number, to: number): void {
        this.queue.splice(from, to);
    }
}