import Module from "../Module";

export default class WebModule implements Module {
    name = "WebUI";
    description = "A browser-based interface for Hahnrich";
    execute(): boolean {
        return true;
        // throw new Error("Method not implemented.");
    }
    stop(): boolean {
        return true;
        // throw new Error("Method not implemented.");
    }
    
}