import LocalSongs from "../MediaPlayer/LocalSongs";
import Song from "../MediaPlayer/Song";
import Answer from "./Answer";
import QuizUser from "./QuizUser";

export default class Round {
    answers = new Map<QuizUser, Answer>();

    constructor(public index: number, public solution: Song) {}

    get Number() {
        return this.index;
    }

    checkAnswers(): Map<QuizUser, Answer> {
        this.answers.forEach(async (answer, user) => {
            const name = (await this.solution.name).toLocaleLowerCase()
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

        return this.answers;
    }

    /**
     * Calculates amount of points that the player gets for his guess
     * @param s Solution string to compare target to
     * @param t Target string
     * @returns Amount of points
     */
    compare(s: string, t: string): number {
        const sArr = [...new Set(LocalSongs.cleanString(s).toLowerCase().split(" "))];
        const tArr = [...new Set(LocalSongs.cleanString(t).toLowerCase().split(" "))];
        
        let points = 0;
        let blocksWrong = 0;

        for(const tBlock of tArr) {
            let wasRight = false;
            for(const sBlock of sArr) {
                if(Round.levenshtein(sBlock, tBlock) < sBlock.length / 2) {
                    if(!wasRight) {
                        points++;
                        wasRight = true;
                    }
                }
            }
            if(!wasRight) blocksWrong++;
                
        }

        if(blocksWrong > 2) points -= blocksWrong;

        return points
    }
    
    /* https://stackoverflow.com/questions/18516942/fastest-general-purpose-levenshtein-javascript-implementation */
    static levenshtein(s: string, t: string) {
        if (s === t) {
            return 0;
        }
        var n = s.length, m = t.length;
        if (n === 0 || m === 0) {
            return n + m;
        }
        var x = 0, y, a, b, c, d, g, h, k;
        var p = new Array(n);
        for (y = 0; y < n;) {
            p[y] = ++y;
        }
    
        for (; (x + 3) < m; x += 4) {
            var e1 = t.charCodeAt(x);
            var e2 = t.charCodeAt(x + 1);
            var e3 = t.charCodeAt(x + 2);
            var e4 = t.charCodeAt(x + 3);
            c = x;
            b = x + 1;
            d = x + 2;
            g = x + 3;
            h = x + 4;
            for (y = 0; y < n; y++) {
                k = s.charCodeAt(y);
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
            var e = t.charCodeAt(x);
            c = x;
            d = ++x;
            for (y = 0; y < n; y++) {
                a = p[y];
                if (a < c || d < c) {
                    d = (a > d ? d + 1 : a + 1);
                }
                else {
                    if (e !== s.charCodeAt(y)) {
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