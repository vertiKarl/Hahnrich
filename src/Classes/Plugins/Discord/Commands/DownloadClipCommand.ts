import { SlashCommandBuilder } from "@discordjs/builders";
import { Permissions, Client, CommandInteraction } from "discord.js";
import Command from "../Command";
import https from "https";
import { load  } from "cheerio";
import EventEmitter from "events";

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
        return false;
    }
    async stop(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    
}