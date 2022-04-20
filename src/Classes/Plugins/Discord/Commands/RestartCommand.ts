import { SlashCommandBuilder } from "@discordjs/builders";
import { Permissions, Client, Interaction, CacheType, CommandInteraction } from "discord.js";
import EventEmitter from "events";
import Command from "../Command";
import ExtendedClient from "../ExtendedClient";

export default class RestartCommand extends Command {
    data = new SlashCommandBuilder();
    permissions = [Permissions.FLAGS.ADMINISTRATOR];

    readonly urlPrefix = "https://karlology.eu/clips/"

    constructor() {
        super()
        this.data
        .setName("restart")
        .setDescription("Restarts Hahnrich")
    }
    async execute(client: ExtendedClient, interaction: CommandInteraction, events?: EventEmitter): Promise<boolean> {
        if(!events) throw new Error("No EventEmitter, can't restart!");

        client.emit("RequestRestart");

        return true;
    }

}