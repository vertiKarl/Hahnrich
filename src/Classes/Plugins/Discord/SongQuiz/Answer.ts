export default class Answer {
    /**
     * An object to keep the answers data in
     * @param text The given string
     * @param isCorrect This toggle gets set from the Round.checkAnswers() function
     */
    constructor(public text: string, public isCorrect?: boolean) {}

    get emoji() {
        return this.isCorrect ? '✅' : '❌';
    }
}