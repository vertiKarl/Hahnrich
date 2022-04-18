import { User } from "discord.js";
import Quiz from "./Quiz";

export default class QuizUser {
    place = -1;
    score = 0;
    lastIncrease = 0;

    constructor(public discord: User) {}

    get increase(): string {
        return this.lastIncrease > 0 ? "+" + this.lastIncrease : "" + this.lastIncrease;
    }
    
    get suffix() {
        if(this.place = -1) return "";
        
        switch(this.place % 10) {
            case 1: {
                return "st";
            }
            case 2: {
                return "nd";
            }
            case 3: {
                return "rd";
            }
            default: {
                return "th";
            }
        }
    }
}