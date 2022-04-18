export default class Answer {
    constructor(public text: string, public isCorrect?: boolean) {}

    get emoji() {
        return this.isCorrect ? '✅' : '❌';
    }
}