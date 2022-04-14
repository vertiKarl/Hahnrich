import Plugin from "../Plugin";
import { Intents, Interaction} from "discord.js";
import { clientId, guildId, token, version } from "./Discord/config.json";
import Command from "./Discord/Command";
import Commands from "./Discord/Commands"
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { SlashCommandBuilder } from "@discordjs/builders";
import ExtendedClient from "./Discord/ExtendedClient";
import EventEmitter from "events";


export default class DiscordPlugin extends Plugin {
    name = "Discord";
    description = "A Discord-bot for Hahnrich";
    emoji = '🎮'

    commands = new Map<string, Command>()

    loadCommands(): Array<Command> {
        const commands: Array<Command> = []
        Commands.forEach(command => {
            commands.push(new command());
        })

        return commands;
    }

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

    async execute(): Promise<boolean> {
        if(!await this.init()) {
            this.stop();
            return false
        };

        const client = new ExtendedClient({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES]
        })

        client.once('ready', () => {
            if(!client?.user) return;

            this.log(`Logged in as ${client.user.tag}`);

            client.user.setPresence({
                activities: [{
                        name: `Version ${version}`,
                        type: "STREAMING",
                        url: "https://twitch.tv/vertiKarl",
                    }],
                status: "online",
            });
        })

        client.on('interactionCreate', (interaction) => this.interactionHandler(client, interaction, DiscordPlugin.events));

        client.login(token);

        return true;
    }

    async stop(): Promise<boolean> {
        this.warn("Stopping Discord plugin!")
        return true;
    }

    async interactionHandler(client: ExtendedClient, interaction: Interaction, events: EventEmitter): Promise<void> {
        if(!interaction.isCommand()) return;

        const command = this.commands.get(interaction.commandName)
        if(!command) return;
        if(command.permissions.length > 0) {
            if(!interaction.member?.permissions || typeof interaction.member?.permissions === "string") return;

            if(!interaction.member?.permissions?.has(command.permissions)) {
                return await interaction.reply("Unsufficient permissions!")
            }
        }

        try {
            const result = await command.execute(client, interaction, events);
            if(!result && !(interaction.replied  || interaction.deferred)) {
                interaction.reply("Sorry, something went wrong!");
            }
        } catch(err) {
            console.error("Unhandled error in DiscordPlugin:", err)
            interaction.reply("Failed executing command!")
            command.stop();
        }

        
    }
}