import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders"
import { Client, Interaction, PermissionResolvable } from "discord.js"
import EventEmitter from "events"
import Logger from "../../Logger"

export default abstract class Command extends Logger {
    emoji = '🎮🛠️'
    abstract data: SlashCommandBuilder
    abstract permissions: Array<PermissionResolvable>
    abstract execute(client: Client, interaction: Interaction, events: EventEmitter): Promise<boolean>
    abstract stop(): Promise<boolean>
}