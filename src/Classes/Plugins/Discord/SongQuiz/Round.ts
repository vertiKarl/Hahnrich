import LocalSongs from "../MediaPlayer/LocalSongs";
import Song from "../MediaPlayer/Song";
import Answer from "./Answer";
import QuizUser from "./QuizUser";

export default class Round {
    answers = new Map<QuizUser, Answer>();

    /**
     * Creates a  round for the quiz. It can check the
     * answers and calculate points according to how
     * close the user answered to the solution.
     * @param index A number to specify which round it is
     * @param solution The solution to the round
     */
    constructor(public index: number, public solution: Song) {}

    get Number() {
        return this.index;
    }

    /**
     * The behavior for rewarding points.
     * Checks the answers of the round and rewards
     * points to the users accordingly.
     * It also sets the isCorrect property on the users to their
     * respective value.
     */
    checkAnswers() {
        this.answers.forEach(async (answer, user) => {
            const name = (await this.solution.name).toLowerCase();
            const points = this.compare(name, answer.text);
            if(points >= 0) {
                answer.isCorrect = true;
                user.score += points;
                user.lastIncrease = points;
            } else {
                answer.isCorrect = false;
                user.score -= 1;
                user.lastIncrease = -1;
            }
            
        })
    }

    /**
     * Calculates amount of points that the player gets for his guess
     * @param solution Solution string to compare target to
     * @param answer Target string
     * @returns Amount of points
     */
    compare(solution: string, answer: string): number {
        // splits the cleaned strings into arrays to make a crosscheck
        // ex:
        // - og: "[Lyrics] Persona 5 - Life Will Change.mp3"
        // - cleanup: "Lyrics Persona 5 Life Will Change"
        // - array: ["Lyrics", "Persona", "5", "Life", "Wil", "Change"]
        // we also cast the string array to a set to remove duplicate entries
        const solutionArray = [...new Set(LocalSongs.cleanString(solution).toLowerCase().split(" "))];
        const answerArray = [...new Set(LocalSongs.cleanString(answer).toLowerCase().split(" "))];
        
        let points = 0;
        let blocksWrong = 0;

        // for each block in the solution string
        for(const answerBlock of answerArray) {
            let wasRight = false;

            // check each block in the answer string
            for(const solutionBlock of solutionArray) {
                // To avoid duplicate awarding of points
                // break if answerBlock was right already
                if(wasRight) break;

                // if answer is less than half of the length 
                // of the solutionBlock away from being right
                if(Round.levenshtein(solutionBlock, answerBlock) < solutionBlock.length / 2) {
                    // add a  point for each answerBlock that matches one or more solutionBlocks
                    points++;

                    // set wasRight to true to make sure it only matches one block
                    // and also count how many answerBlocks were wrong
                    wasRight = true;
                }
            }
            if(!wasRight) blocksWrong++;
        }

        // Subtract the amount of wrong blocks from points
        // when there were more than two blocks wrong
        if(blocksWrong > 2) points -= blocksWrong;

        return points
    }
    
    /**
     * Compares two strings with each other to check how many edits it would need
     * to get to the other string.
     * minimal edit from source: https://stackoverflow.com/questions/18516942/fastest-general-purpose-levenshtein-javascript-implementation
     * @param solution 
     * @param answer 
     * @returns 
     */
    static levenshtein(solution: string, answer: string) {
        if (solution === answer) {
            return 0;
        }
        var n = solution.length, m = answer.length;
        if (n === 0 || m === 0) {
            return n + m;
        }
        var x = 0, y, a, b, c, d, g, h, k;
        var p = new Array(n);
        for (y = 0; y < n;) {
            p[y] = ++y;
        }
    
        for (; (x + 3) < m; x += 4) {
            var e1 = answer.charCodeAt(x);
            var e2 = answer.charCodeAt(x + 1);
            var e3 = answer.charCodeAt(x + 2);
            var e4 = answer.charCodeAt(x + 3);
            c = x;
            b = x + 1;
            d = x + 2;
            g = x + 3;
            h = x + 4;
            for (y = 0; y < n; y++) {
                k = solution.charCodeAt(y);
                a = p[y];
                if (a < c || b < c) {
                    c = (a > b ? b + 1 : a + 1);
                }
                else {
                    if (e1 !== k) {
                        c++;
                    }
                }
    
                if (c < b || d < b) {
                    b = (c > d ? d + 1 : c + 1);
                }
                else {
                    if (e2 !== k) {
                        b++;
                    }
                }
    
                if (b < d || g < d) {
                    d = (b > g ? g + 1 : b + 1);
                }
                else {
                    if (e3 !== k) {
                        d++;
                    }
                }
    
                if (d < g || h < g) {
                    g = (d > h ? h + 1 : d + 1);
                }
                else {
                    if (e4 !== k) {
                        g++;
                    }
                }
                p[y] = h = g;
                g = d;
                d = b;
                b = c;
                c = a;
            }
        }
    
        for (; x < m;) {
            var e = answer.charCodeAt(x);
            c = x;
            d = ++x;
            for (y = 0; y < n; y++) {
                a = p[y];
                if (a < c || d < c) {
                    d = (a > d ? d + 1 : a + 1);
                }
                else {
                    if (e !== solution.charCodeAt(y)) {
                        d = c + 1;
                    }
                    else {
                        d = c;
                    }
                }
                p[y] = d;
                c = a;
            }
            h = d;
        }
    
        return h;
    }
}