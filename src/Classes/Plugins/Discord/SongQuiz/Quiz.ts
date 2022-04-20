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
    cache: Array<Song>;
    stopped = false;
    voting: Message | null = null;
    acceptingVotes = false;
    readonly MAXROUNDS = 25; // Discord drops connection after that

    activeTimeouts: NodeJS.Timeout[] = [];

    /**
     * The SongQuiz object for controlling behavior.
     * If there was no mediaplayer object provided it creates one from the given
     * interaction. If there was an active mediaplayer though, it saves the active
     * queue to memory to restore it after the quiz is over.
     * @param client A client object for interacting with different discord guilds
     * @param interaction The interaction which triggered this mediaplayer
     * @param mediaplayer [Optional] The mediaplayer to use for the quiz (if none was given, it creates one from the interaction parameter)
     */
    constructor(public client: ExtendedClient, public interaction: CommandInteraction, public mediaplayer?: MediaPlayer) {
        super();
        if(!this.mediaplayer) {
            this.debug("No mediaplayer provided, creating...")
            this.mediaplayer = this.getMediaplayer();
        }

        this.debug("Cloning queue...")
        this.cache = this.mediaplayer.queue.cloneSongs();
        this.mediaplayer.queue.queue = [];

        if(this.mediaplayer.connection)
        this.startRound();
    }

    get currentRound(): Round | undefined {
        return this.rounds.get(this.round);
    }

    /**
     * Starts a round and increases the round counter by one
     * @returns The started Round-object
     */
    startRound(): Round {
        if(!this.mediaplayer) throw new Error("Mediaplayer not defined!");
        this.round++;
        this.debug("Round", this.round, "starting!")
        const round = new Round(this.round, this.generateSong());

        this.rounds.set(this.round, round);
        
        const song = this.mediaplayer.add(round.solution, SongPosition.NOW);
        this.debug("Quiz-Song:", song)
        this.log("CURRENT SONG:",this.mediaplayer.queue.currentSong);
        this.startVotes();
        return round;
    }

    /**
     * Starts the voting phase of the quiz and sets timeouts
     * to call the following functions automatically after
     * specified time.
     */
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

    /**
     * Ends the voting phase, checks the answers, awards points,
     * sets the current ranks accordingly and shows the current
     * Scoreboard. Also sets a timeout after which it decides
     * what to do next.
     * 
     * If this.stopped got set it simply exits. Otherwise it
     * checks if the number of MAXROUNDS got exceeded at
     * which Discord won't let you change the embed anymore.
     * So we need to exit there as well.
     */
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

    /**
     * Sorts the participating users by points and sets
     * the resulting order in their respective objects
     */
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

    /**
     * Generates an embed from the participants
     * of the active round
     * @returns The resulting Discord-Embed
     */
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
            participatingString += `${place}${user.suffix} ${user.discord.tag} (${user.score})\n`
        })

        if(participatingString === "") participatingString = "none"

        embed.addField("Participants:", participatingString);

        return embed;
    }

    /**
     * When an answer gets retrieved this function gets
     * triggered.
     * If the voting phase is currently active it sets
     * the answer by given user in the answers map of
     * the current round.
     * If the user wasn't previously added to the game,
     * they get added at this point.
     * Then it replies with the current voting-embed.
     * It also replies to the sent command with the
     * registered answer, so the user can check if
     * they had a typo in their answer.
     * @param interaction The message from the user we can use to tell them what they answered
     * @param user The user who answered
     * @param answer The answer object containing their answer
     */
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

    /**
     * Replies to this.interaction with the results of
     * a specified round
     * @param round The round to get the results of
     */
    async showResults(round: Round) {
        // TODO: REFACTOR *a lot*
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

    /**
     * Shows the final results and (not yet) displays the winner of the round!
     */
    async showFinalResults() {
        // TODO: REFACTOR *a lot*
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

    /**
     * Stops the quiz after the current round is over.
     * Hint: The mediaplayer gets potentially replaced with
     * the original mediaplayer before the round is over.
     */
    async stop() {
        if(!this.currentRound) throw new Error("No round active")
        // Show final results
        await this.showFinalResults();

        this.stopped = true;
        // rebuilding original mediaplayer
        if(this.mediaplayer) {
            // stop playback so garbage collection can take the resource
            // and it can change the resource
            //this.mediaplayer.player.stop();
            
            // replace queue with original
            this.debug("Replacing queue with original")
            // when the original queue had songs
            if(this.cache.length > 0) {
                this.mediaplayer.queue.queue = this.cache.slice(0);
                this.mediaplayer.play(true);
                this.mediaplayer = undefined;
            }
        }
    }

    /**
     * Creates a new mediaplayer from the scoped information.
     * (this.client and this.interaction)
     * @returns A new mediaplayer-object
     */
    getMediaplayer(): MediaPlayer {
        return new MediaPlayer(this.client, this.interaction);
    }

    /**
     * Fetches a random song from the Songs directory at the root
     * of the project.
     * @returns A randomly selected song
     */
    generateSong(): Song {
        return new Song(SongType.FILE, LocalSongs.randomSongs(1)[0]);
    }
}