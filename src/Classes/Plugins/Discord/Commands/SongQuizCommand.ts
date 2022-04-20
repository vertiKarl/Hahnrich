import { SlashCommandBuilder } from "@discordjs/builders";
import { PermissionResolvable, Client, Interaction, CacheType, CommandInteraction, GuildMember } from "discord.js";
import EventEmitter from "events";
import Command from "../Command";
import ExtendedClient from "../ExtendedClient";
import Answer from "../SongQuiz/Answer";
import Quiz from "../SongQuiz/Quiz";

/**
 * A command, to host a SongQuiz in a Discord-VoiceChannel
 */
export default class SongQuizCommand extends Command {
    data = new SlashCommandBuilder();
    permissions = [];

    constructor() {
        super();
    
        this.data
          .setName("sq")
          .setDescription("Song-quiz controls")
          .addSubcommand((cmd) =>
          cmd
            .setName("start")
            .setDescription("Starts the song quiz!")
        )
        .addSubcommand((cmd) =>
        cmd
        .setName("submit")
        .setDescription("Submits an answer to the quiz!")
        .addStringOption((option) =>
        option.setName("answer").setDescription("Your answer!")
      )
        )
        .addSubcommand((cmd) => 
        cmd
        .setName("stop")
        .setDescription("Stops the song quiz")
        )
    }

  /**
   * @param client The client of the DiscordPlugin
   * @param interaction The interaction which triggered this command
   * @returns true on success and false on error
   */
    async execute(client: ExtendedClient, interaction: CommandInteraction): Promise<boolean> {
        const func = interaction.options.getSubcommand();
        let answer = interaction.options.getString("answer");
        
    
        const member = interaction.member;
        if (!(member instanceof GuildMember))
            throw new Error("Member is not an instance of GuildMember!");
    
        const channel = member.voice.channel;

        if(!channel) {
            await interaction.reply("You are not in a VoiceChannel!");
            return false;
        }
    
        let mediaplayer = client.mediaplayers.get(member.guild.id);
        let songquiz = client.songquizes.get(member.guild.id);

        
        try {
            switch(func) {
                case "start": {
                    this.debug("Song quiz already running?", !!songquiz);
                    if(!songquiz) {
                        await interaction.deferReply();
                        client.songquizes.set(member.guild.id, new Quiz(client, interaction, mediaplayer));
                    } else {
                        await interaction.reply("Already running");
                    }
                    return true;
                }
                case "submit": {
                    if(!songquiz) {
                        await interaction.reply("No songquiz active!")
                    } else {
                        if(!answer) {
                            await interaction.reply("No answer given!")
                            return false;
                        } else {
                            songquiz.registerAnswer(interaction, member.user, new Answer(answer));
                        }
                        
                    }
                    return true;
                }
                case "stop": {
                    if(!songquiz) {
                        await interaction.reply("No songquiz active!")
                    } else {
                        await interaction.reply("Stopping quiz and returning to previous queue!")
                        songquiz.stop();
                        client.songquizes.delete(member.guild.id);
                    }
                    return true;
                }
            }
        }
        catch(err) {
            this.error("Error in Songquiz!", err);
            return false;
        }

        return true;
    }
    stop(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    
}