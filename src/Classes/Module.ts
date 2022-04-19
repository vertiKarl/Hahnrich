import EventEmitter from "events"
import Hahnrich from "./Hahnrich";
import Logger from "./Logger"

/**
 * The parent class of modules to force them
 * to implement abstract properties and methods.
 * Also takes a reference to the parent controller
 * object to interface with it.
 */
export default abstract class Module extends Logger {
    static controller: Hahnrich;
    abstract name: string;
    abstract description: string;
    abstract execute(): boolean;
    abstract stop(): boolean;
}