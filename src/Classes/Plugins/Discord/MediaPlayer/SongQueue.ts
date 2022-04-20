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


    /**
     * Clones the object and makes a copy of the queue
     * @returns A clone of an instance of type SongQueue
     */
    cloneSongs(): Array<Song> {
        return this.queue.slice(0);
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

    /**
     * Adds a given song to the specified position in queue
     * @param song Song to push
     * @param position SongPosition to push to
     */
    pushToPosition(song: Song, position: SongPosition) {
        console.debug("Pushing", song.name, "to position", position, "(SongPosition) in queue")
        switch(position) {
            case SongPosition.NOW:
                console.debug("SONGCHANGE EVENT:", song)
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