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
     * Shuffles the array containing the songs and triggers a SongChange event.
     * source: https://stackoverflow.com/a/2450976
     */
    shuffle(): void {
        if(this.queue.length <= 1) return; // nothing to do here
        this.queue.splice(0, 1);

        let currentIndex = this.queue.length,  randomIndex;

        // While there remain elements to shuffle.
        while (currentIndex != 0) {

            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [this.queue[currentIndex], this.queue[randomIndex]] = [
                this.queue[randomIndex], this.queue[currentIndex]];
        }

        this.emit("SongChange");
    }

    /**
     * Moves a specified index to the end of the queue.
     * Used by the mediaplayer when Modifier.LOOP is active.
     * @param index The index of the song to move
     */
    moveIndexToEnd(index: number): void {
        //console.log("MOVING", index, "to END")
        if(index < 0 || index > this.length) return;

        const i = this.queue.push(this.queue[index]);
        //console.log(i)
        this.queue.splice(index, 1);
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
                console.debug("PUSHTOEND  EVENT",  song)
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