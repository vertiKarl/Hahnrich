import { CommandInteraction, Message, MessageEmbed, User } from "discord.js";
import QuizUser from "./QuizUser";
import ExtendedClient from "../ExtendedClient";
import LocalSongs from "../MediaPlayer/LocalSongs";
import MediaPlayer from "../MediaPlayer/MediaPlayer";
import Song, { SongType } from "../MediaPlayer/Song";
import SongQueue, { SongPosition } from "../MediaPlayer/SongQueue";
import Answer from "./Answer";
import Round from "./Round";
import Logger from "../../../Logger";

export default class Quiz extends Logger {
    emoji = '📙';
    round = 0;
    rounds = new Map<number, Round>();
    readonly PLAYTIME = 10 /* seconds */ * 1000 /* milliseconds */;
    readonly VOTETIME = 20 /* seconds */ * 1000 /* milliseconds */;
    readonly PAUSETIME = 10 /* seconds */ * 1000 /* milliseconds */;
    participants = new Map<string, QuizUser>();
    cache: SongQueue;
    stopped = false;
    voting: Message | null = null;
    acceptingVotes = false;
    readonly MAXROUNDS = 25; // Discord drops connection after that

    activeTimeouts: NodeJS.Timeout[] = [];

    constructor(public client: ExtendedClient, public interaction: CommandInteraction, public mediaplayer?: MediaPlayer) {
        super();
        if(!this.mediaplayer) this.mediaplayer = this.getMediaplayer();

        this.cache = this.mediaplayer.queue.clone();
        this.mediaplayer.removeAt(0, this.mediaplayer.queue.length);

        this.startRound();
    }

    get currentRound(): Round | undefined {
        return this.rounds.get(this.round);
    }

    startRound(): Round {
        if(!this.mediaplayer) throw new Error("Mediaplayer not defined!");
        this.round++;
        const round = new Round(this.round, this.generateSong());

        this.rounds.set(this.round, round);
        
        this.mediaplayer.add(round.solution, SongPosition.NOW);
        this.startVotes();
        return round;
    }

    async startVotes() {
        await this.interaction.editReply({embeds: [this.getVotingEmbed()]});

        this.debug("VOTING STARTS")
        this.acceptingVotes = true;
        setTimeout(() => {
            if(this.stopped) return;
            this.debug("PAUSING AUDIO")
            this.mediaplayer?.player.pause();
        }, this.PLAYTIME);
        setTimeout(() => {
            if(this.stopped) return;
            this.debug("ENDING VOTES")
            this.endVotes()
        }, this.VOTETIME);
    }

    endVotes() {
        if(!this.currentRound) throw new Error("No round active")
        this.acceptingVotes = false;
        this.debug("VOTING ENDED")
        this.mediaplayer?.player.unpause();
        this.currentRound.checkAnswers()
        this.setPlaces();
        this.showResults(this.currentRound);
        setTimeout(() => {
            if(this.stopped) return;
            this.debug("Pause over, deciding what to do next...")
            if(!this.stopped || this.round <= this.MAXROUNDS) {
                this.debug("starting a new round!")
                this.startRound();
            } else {
                if(!this.currentRound) throw new Error("No round active!");
                this.debug("stopping quiz!")
                this.stop();
            }
        }, this.PAUSETIME);
    }

    setPlaces() {
        let users: QuizUser[] = []
        this.participants.forEach((user: QuizUser, id: string) => {
            users.push(user);
        })

        users = users.sort((a, b) => {
            return b.score - a.score;
        })

        for(let i = 0; i < users.length; i++) {
            users[i].place = i + 1;
        }
    }

    getVotingEmbed(): MessageEmbed {
        if(!this.currentRound) throw new Error("No round active")
        const embed = new MessageEmbed();
        embed
          .setColor("#02f3f3")
          .setTitle(`Participate with /sq submit`)
          .setAuthor({
            name: "Song-Quiz Round " + this.round
          });


        let participatingString = ""
        this.currentRound.answers.forEach((answer: Answer, user: QuizUser) => {
            this.debug("User:", user.discord.tag, "answered:", answer.text);
            let place;
            if(user.place > 0) {
                place = user.place;
            } else {
                place = ""
            }
            participatingString += `${user.place}${user.suffix} ${user.discord.tag} (${user.score})\n`
        })

        if(participatingString === "") participatingString = "none"

        embed.addField("Participants:", participatingString);

        return embed;
    }

    registerAnswer(interaction: CommandInteraction, user: User, answer: Answer) {
        if(!this.currentRound) throw new Error("No round active")
        if(!this.acceptingVotes) {
            interaction.reply({ content: 'Sorry but votes are already closed!', ephemeral: true});
            return;
        }
        let qUser = this.participants.get(user.id);
        if(!qUser) {
            const newUser = new QuizUser(user);
            this.participants.set(user.id, newUser);
            this.currentRound.answers.set(newUser, answer);
        } else {
            this.currentRound.answers.set(qUser, answer);
        }

        this.interaction.editReply({embeds: [this.getVotingEmbed()]});
        const message = interaction.reply({ content: 'Answer: ' + answer.text + " registered.", ephemeral: true })
    }

    async showResults(round: Round) {
        // TODO: REFACTOR *alot*
          const embed = new MessageEmbed();
          embed
            .setColor("#02f3f3")
            .setTitle(`Solution:`)
            .setDescription(await round.solution.name)
            .setAuthor({
              name: "Song-Quiz Round " + round.index
            });

            let users: {user: QuizUser, answer: Answer}[] = []
            round.answers.forEach((answer: Answer, user: QuizUser) => {
                users.push({user, answer});
            })
    
            users = users.sort((a, b) => {
                return b.user.score - a.user.score;
            })

        
            users.forEach(({answer, user}: {answer: Answer, user: QuizUser}) => {
                this.debug("Adding", user.discord.tag, "to results page")
                embed.addField(
                    `${user.place}${user.suffix} ${user.discord.tag}`,
                    `${answer.text} ${answer.emoji} (${user.score}) ${user.increase}`);
            })

        this.interaction.editReply({embeds: [embed]});
    }

    async showFinalResults() {
        // TODO: REFACTOR *alot*
          const embed = new MessageEmbed();
          embed
            .setColor("#02f3f3")
            .setTitle(`Conclusion:`)
            .setAuthor({
              name: "Song-Quiz"
            });

            let users: QuizUser[] = []
            this.participants.forEach((user: QuizUser, key: string) => {
                users.push(user);
            })
    
            users = users.sort((a, b) => {
                return b.score - a.score;
            })
        
            users.forEach((user: QuizUser) => {
                this.debug("Adding", user.discord.tag, "to final scoreboard")
                embed.addField(
                    `${user.place}${user.suffix} ${user.discord.tag}`,
                    `(${user.score}) ${user.increase}`);
            })

        this.interaction.editReply({embeds: [embed]});
    }

    async stop() {
        if(!this.currentRound) throw new Error("No round active")
        // Show final results
        await this.showFinalResults();

        // rebuilding original mediaplayer
        this.stopped = true;
        if(this.mediaplayer) {
            // replace queue with original
            this.debug("Replacing queue with original")
            this.mediaplayer.queue = this.cache;
            this.mediaplayer.play(true);
        }

        if(this.interaction.guild) {
            this.client.songquizes.delete(this.interaction.guild.id);
        }
    }

    getMediaplayer(): MediaPlayer {
        return new MediaPlayer(this.client, this.interaction);
    }

    generateSong(): Song {
        return new Song(SongType.FILE, LocalSongs.randomSongs(1)[0]);
    }
}