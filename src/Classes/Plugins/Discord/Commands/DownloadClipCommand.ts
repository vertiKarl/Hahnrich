import { SlashCommandBuilder, PermissionsBitField, Client, CommandInteraction, CommandInteractionOptionResolver, InteractionType, ChatInputCommandInteraction } from "discord.js";
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
    permissions = [PermissionsBitField.Flags.Administrator];

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
    async execute(client: Client<boolean>, interaction: ChatInputCommandInteraction, events: EventEmitter): Promise<boolean> {
        await interaction.deferReply();
        let responded = false;
        
        const url = interaction.options.getString("url");
        if(!url) {
            await interaction.editReply("No url specified!")
            return false;
        }
        
        events.emit("DownloadRequest", url);

        events.on("DownloadInvalidURL", async () => {
            if(!responded) {
                await interaction.editReply("Invalid url provided!");
                responded = true;
            }
        })

        events.on("DownloadError", async () => {
            if(!responded) {
                await interaction.editReply("Error when trying to download clip!");
                responded = true;
            }
        })

        // Currently not implemented
        // events.on("DownloadProgress", async (title: string, progress: number) => {
        //     if(!responded) {
        //         await interaction.editReply(`[${progress}%] Downloading ${title}`);
        //     }
        // })

        events.on("DownloadAlreadyThere", async (title: string, id: number) => {
            if(!responded) {
                await interaction.editReply(`Clip ${title} already downloaded!\nYou can find it here: ${this.urlPrefix}${id}`);
                responded = true;
            }
        })

        events.on("DownloadFinished", async (title: string, id: number) => {
            if(!responded) {
                await interaction.editReply(`Finished downloading ${title}, you can find it here: ${this.urlPrefix}${id}`);
                responded = true;
            }
        })
        return true;
    }
    
}