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

    get currentSong(): Song | null {
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

    clone(): SongQueue {
        const q = new SongQueue();
        q.queue = this.queue.slice(0);
        return q;
    }

    /**
     * Checks if queue has more than one song
     * @returns True if queue has more than one song left
     */
    hasNext(): boolean {
        return this.queue.length > 1;
    }

    /**
     * Adds song to end of queue
     * @param song Song to add to queue
     */
    push(song: Song) {
        this.queue.push(song);
        this.emit("push");
    }

    pushToPosition(song: Song, position: SongPosition) {
        switch(position) {
            case SongPosition.NOW:
                this.queue[0] = song;
                this.emit("SongChange");
                break;
            case SongPosition.NEXT:
                this.queue.splice(1, 0, song);
                this.emit("push");
                break;
            case SongPosition.END:
                this.queue.push(song);
                this.emit("push");
        }
    }

    /**
     * Adds song to beginning of queue
     * @param song Song to add to queue
     */
    unshift(song: Song) {
        this.emit("unshift");
        this.queue[0] = song;
    }

    /**
     * Removes songs "from" to "to" in queue
     * @param from number from which removing starts
     * @param deleteCount amount of songs to remove
     */
    splice(from: number, deleteCount: number): void {
        if(from + deleteCount > this.length) {
            throw new Error("Splicing out of bounds!")
        };

        this.queue.splice(from, deleteCount);
    }
}

export enum SongPosition {
    NOW, NEXT, END
}