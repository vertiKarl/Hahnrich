import Plugin from "../Plugin";

/**
 * A plugin for interaction with the streaming platform Twitch!
 */
export default class TwitchPlugin extends Plugin {
  name = "Twitch";
  description = "A Twitch plugin for Hahnrich!";
  emoji = "💬";
  client?: null;

    /**
     * Starts the Twitch-client and EventListeners
     * @returns Success-state
     */
  async execute(): Promise<boolean> {
    return true;
  }

  stop() {
    // no stop needed
  }
  
}
