import EventEmitter from "events"
import Logger from "./Logger"

/**
 * The parent class of plugins to force them
 * to implement abstract properties and methods.
 * Also declares a shared/static EventEmitter to use
 * in all plugins to allow cross-communication
 */
export default abstract class Plugin extends Logger {
    static events = new EventEmitter();
    abstract name: string
    abstract description: string
    abstract emoji: string

    abstract execute(): Promise<boolean>
}