import EventEmitter from "events";
import Logger from "@vertikarl/ts-logger";

/**
 * The parent class of plugins to force them
 * to implement abstract properties and methods.
 * Also declares a shared/static EventEmitter to use
 * in all plugins to allow cross-communication
 */
export default abstract class Plugin extends Logger {
  abstract events: EventEmitter;
  abstract name: string;
  abstract description: string;
  abstract emoji: string;
  abstract settings?: any;

  abstract execute(): Promise<void>;
  abstract stop(): Promise<void>;
}
