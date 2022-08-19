import { CommandInteraction, ContextMenuCommandBuilder, PermissionResolvable, SlashCommandBuilder, SlashCommandSubcommandBuilder } from "discord.js"
import EventEmitter from "events"
import Logger from "../../Logger"
import ExtendedClient from "./ExtendedClient"

/**
 * Parent class from which commands inherit
 */
export default abstract class Command extends Logger {
    emoji = '🎮🛠️'
    abstract data: SlashCommandBuilder | ContextMenuCommandBuilder
    abstract permissions: Array<PermissionResolvable>
    abstract execute(client: ExtendedClient, interaction: CommandInteraction, events?: EventEmitter): Promise<boolean>
}