import EventEmitter from "events"
import Logger from "./Logger"

export default abstract class Plugin extends Logger {
    static events = new EventEmitter();
    abstract name: string
    abstract description: string
    abstract emoji: string

    abstract execute(): Promise<boolean>
    abstract stop(): Promise<boolean>
}