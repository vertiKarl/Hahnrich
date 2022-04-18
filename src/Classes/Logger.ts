import fs from "fs";

export default abstract class Logger {
    
    static HahnrichVersion: string;
    static isDebug = false;
    abstract emoji: string

    get time(): string {
        const date = new Date();
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }

    /**
     * Appends content to end of log file
     * @param data content to log to file
     */
    async log2file(...data: any): Promise<void> {
        fs.appendFileSync("./latest.log", "\n" + data.join(" "), { encoding: "utf-8"})
    }

    /**
     * Only outputs to console when isDebug is true
     * @param content Content to print to debug out
     */
    async debug(...content: any): Promise<void> {
        if(!Logger.isDebug) return;
        content = this.parseObjects(content);
        console.debug(this.emoji + " [DEBUG] ["+this.time+"]", content.join(" "))
    }

    /**
     * @param content Content to log
     */
    async log(...content: any): Promise<void> {
        content = this.parseObjects(content);
        console.log(this.emoji + " ["+this.time+"]", content.join(" "))
    }

    /**
     * @param content Content to warn about
     */
    async warn(...content: any): Promise<void> {
        content = this.parseObjects(content);
        console.warn(`\u001b[30;1m\u001b[48;5;208m${this.emoji}\u001b[0m [${this.time}]`, content.join(" "))
    }

    /**
     * @param content Content to error out and log to file
     */
    async error(...content: any): Promise<void> {
        content = this.parseObjects(content);
        const text = `[${this.time}] ` + content.join(" ")
        console.error(`\u001b[1m\u001b[41;1m\u001b[38;5;231m${this.emoji}\x1b[0m` + text);
        this.log2file(text);
    }

    private parseObjects(content: any[]): any[] {
        // make objects visible
        for(const i in content) {
            if(typeof content[i] == "object") {
                content[i] = JSON.stringify(content[i], this.getCircularReplacer(), 2);
            }
        }

        return content;
    }

    private getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key: any, value: any) => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
              return;
            }
            seen.add(value);
          }
          return value;
        };
      };
}