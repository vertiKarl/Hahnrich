import Plugin from "../Plugin";
import { Intents, Interaction} from "discord.js";
import { clientId, guildId, token } from "./Discord/config.json";
import Command from "./Discord/Command";
import Commands from "./Discord/Commands"
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { SlashCommandBuilder } from "@discordjs/builders";
import ExtendedClient from "./Discord/ExtendedClient";
import EventEmitter from "events";

/**
 * A plugin for interaction on the realtime chat application Discord!
 */
export default class DiscordPlugin extends Plugin {
    name = "Discord";
    description = "A Discord-bot for Hahnrich";
    emoji = '🎮'
    client?: ExtendedClient

    commands = new Map<string, Command>()

    /**
     * Loads all commands specified in ./Discord/Commands.ts
     * @returns A list of all enabled commands
     */
    loadCommands(): Array<Command> {
        const commands: Array<Command> = []
        Commands.forEach(command => {
            commands.push(new command());
        })

        return commands;
    }

    /**
     * Initializes the instance by requesting to put the application commands
     * into the discord api
     * @returns Success-state
     */
    async init(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const rest = new REST().setToken(token);
            const commands = this.loadCommands();
            const commandData: Array<SlashCommandBuilder> = [];
            commands.forEach(command => {
                this.commands.set(command.data.name, command);
                commandData.push(command.data);
            })

            rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commandData }
            )
            .then(() => {
                this.log("Successfully registered application commands!")
                resolve(true);
            })
            .catch(err => {
                this.error("Failed registering application commands!", err)
                resolve(false);
            })
        })
    }

    /**
     * Starts the Discord-client and starts the interactionHandler
     * @returns Success-state
     */
    async execute(): Promise<boolean> {
        if(!await this.init()) {
            return false
        };

        const client = new ExtendedClient({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES]
        })

        this.client = client;

        client.on('ready', () => {
            if(!client?.user) return;

            this.log(`Logged in as ${client.user.tag}`);

            client.user.setPresence({
                activities: [{
                        name: `Version ${DiscordPlugin.HahnrichVersion}`,
                        type: "STREAMING",
                        url: "https://twitch.tv/vertiKarl",
                    }],
                status: "online",
            });
        })

        client.on("RequestRestart", () => {
            Plugin.events.emit("Restart", this);
        })

        client.on('interactionCreate', (interaction) => this.interactionHandler(client, interaction, DiscordPlugin.events));

        client.login(token);

        return true;
    }

    stop() {
        this.client?.destroy();
    }

    /**
     * Handles the behavior when receiving interactions from discord
     * @param client The discord client
     * @param interaction The interaction itself
     * @param events The eventemitter which connects the plugins
     * @returns The success-state of the processing
     */
    async interactionHandler(client: ExtendedClient, interaction: Interaction, events: EventEmitter): Promise<void> {
        if(!interaction.isCommand()) return;

        const command = this.commands.get(interaction.commandName)
        if(!command) return;
        if(command.permissions.length > 0) {
            if(!interaction.member?.permissions || typeof interaction.member?.permissions === "string") return;

            if(!interaction.member?.permissions?.has(command.permissions)) {
                return await interaction.reply("Insufficient permissions!")
            }
        }

        try {
            const result = await command.execute(client, interaction, events);
            if(!result && !(interaction.replied  || interaction.deferred)) {
                await interaction.reply("Sorry, something went wrong!");
            }
        } catch(err) {
            console.error("Unhandled error in DiscordPlugin:", err)
            if(!(interaction.replied  || interaction.deferred)) {
                await interaction.reply("Failed executing command!")
            } else {
                await interaction.editReply("Failed executing command!");
            }
        }

        
    }
}