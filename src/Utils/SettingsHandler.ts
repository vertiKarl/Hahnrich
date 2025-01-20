import { PathLike } from "fs";
import fs from "fs/promises";
import Logger from "./Logger";

interface Settings {
    showLogo: boolean;
    plugins: Map<string, any>;
}

const defaultSettings: Settings = {
    showLogo: true,
    plugins: new Map()
}

export default class SettingsHandler extends Logger {
    private settings: Settings;
    emoji = '🐔🔨';
    file: PathLike;

    constructor(file: PathLike) {
        super();
        this.settings = defaultSettings;
        this.file = file;
    }

    getSettings() {
        return this.settings;
    }

    async loadFromFile() {
        let settings: Settings;
        this.debug("Reading from file", this.file)
        try {
            const data = await fs.readFile(this.file, "utf-8"); 
            const json = JSON.parse(data);
            let map = new Map<string, string>();
            for (var value in json.plugins) {
                map.set(value, json.plugins[value]);
            }
            settings = json;
            settings.plugins = map;
        } catch(err) {
            if((err as any).code === "ENOENT") {
                // file does not exists
                this.warn("File", this.file, "does not exist. Creating and loading default settings.");
                await fs.writeFile(this.file, JSON.stringify(defaultSettings, null, 4));
                settings = defaultSettings;
            } else {
                return this.error(err);
            }
        }

        this.settings = settings;

    }

    async writeToFile() {
        const settings = this.settings;
        let json: any = {};
        this.settings.plugins.forEach((value, key) => {
            json[key] = value;
        });
        
        settings.plugins = json;
        
        const data = JSON.stringify(this.settings, null, 4);
        this.debug("file data", data);

        await fs.writeFile(this.file, data);
    }

    addPlugin(pluginName: string) {
        const obj = this.settings.plugins.get(pluginName);
        if(obj) {
            this.error("Plugin with name", pluginName, "already exists. Skipping...");
            return;
        }
        this.debug("Now managing settings for", pluginName);

        this.settings.plugins.set(pluginName, {});
    }

    changePluginSetting(pluginName: string, key: string, value: any) {
        const obj = this.settings.plugins.get(pluginName);
        if(!obj) {
            this.error("Couldn't change setting", key, "for plugin", pluginName);
            return;
        }

        // TODO: maybe sanitize if plugins are untrusted
        obj[key] = value;
        this.settings.plugins.set(pluginName, obj);
    }
}