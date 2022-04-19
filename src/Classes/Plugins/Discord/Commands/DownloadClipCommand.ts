import { SlashCommandBuilder } from "@discordjs/builders";
import { Permissions, Client, CommandInteraction } from "discord.js";
import Command from "../Command";
import https from "https";
import { load  } from "cheerio";
import EventEmitter from "events";

/**
 * A command which interacts with TwitchPlugin, to fetch a clip and download it
 * When serving the directory Clips in the root of this project you can specify
 * the urlPrefix leading up to these files
 */
export default class DownloadClipCommand extends Command {
    data = new SlashCommandBuilder();
    permissions = [Permissions.FLAGS.ADMINISTRATOR];

    readonly urlPrefix = "https://karlology.eu/clips/"

    constructor() {
        super()
        this.data
        .setName("s")
        .setDescription("Twitch-Clip downloader")
        .addStringOption((option) =>
            option
            .setName("url")
            .setDescription("URL of clip")
            .setRequired(true)
        )
    }

    /**
     * @param client The client of the DiscordPlugin
     * @param interaction The interaction which triggered this command
     * @param events The EventEmitter attached to the DiscordPlugin to communicate with the TwitchPlugin
     * @returns true on success and false on error
     */
    async execute(client: Client<boolean>, interaction: CommandInteraction, events: EventEmitter): Promise<boolean> {
        await interaction.deferReply();
        const url = interaction.options.getString("url");
        if(!url) {
            interaction.editReply("No url specified!")
            return false;
        }
        
        events.emit("DownloadRequest", url);

        events.on("DownloadInvalidURL", () => {
            interaction.editReply("Invalid url provided!");
        })

        events.on("DownloadError", () => {
            interaction.editReply("Error when trying to download clip!")
        })

        events.on("DownloadProgress", (title: string, progress: number) => {
            interaction.editReply(`[${progress}%] Downloading ${title}`)
        })

        events.on("DownloadAlreadyThere", (title: string, id: number) => {
            interaction.editReply(`Clip ${title} already downloaded!\nYou can find it here: ${this.urlPrefix}${id}`);
        })

        events.on("DownloadFinished", (title: string, id: number) => {
            interaction.editReply(`Finished downloading ${title}, you can find it here: ${this.urlPrefix}${id}`)
        })
        return true;
    }
    
}