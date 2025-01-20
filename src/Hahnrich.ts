import Module from "./Module";
import Plugin from "./Plugin";
import fs from "fs/promises";
import Logger from "./Utils/Logger";
import {version} from "./version";
import path, { dirname } from "path";
import SettingsHandler from "./Utils/SettingsHandler";

const SETTINGS_PATH = path.join(__dirname, "../config.json")

const logo =`
#     #    #    #     # #     # ######  ###  #####  #     # 
#     #   # #   #     # ##    # #     #  #  #     # #     # 
#     #  #   #  #     # # #   # #     #  #  #       #     # 
####### #     # ####### #  #  # ######   #  #       ####### 
#     # ####### #     # #   # # #   #    #  #       #     # 
#     # #     # #     # #    ## #    #   #  #     # #     # 
#     # #     # #     # #     # #     # ###  #####  #     # 
`

/**
 * The top class that gets used to manage Plugins and Modules
 */
export default class Hahnrich extends Logger {
    plugins: Map<String, Plugin> = new Map<String, Plugin>();
    private modules: Map<String, Module> = new Map<String, Module>();
    settingsHandler: SettingsHandler = new SettingsHandler(SETTINGS_PATH);

    emoji = '🐔'

    constructor() {
        super()
        Logger.HahnrichVersion = version;
        this.init();
        setInterval(() => {

        }, 10000);
    }

    /**
     * Adds a plugin instance to the plugins map to keep
     * it in memory and allow runtime manipulation.
     * @param plugin A plugin instance to import to plugins map
     */
    loadPlugin(plugin: Plugin) {
        this.debug("Plugin '"+plugin.name+"' starting!");
        this.plugins.set(plugin.name, plugin);
        const settings = this.settingsHandler.getSettings();
        const initialSettings = settings.plugins.get(plugin.name);
        
        if(initialSettings) {
            this.debug("Loading initial settings for", plugin.name+"\n", initialSettings);
            plugin.settings = initialSettings;
        }

        plugin.events.on("GET_VERSION", () => {
            this.debug("Sending version to", plugin.name, "("+version+")");
            let a = plugin.events.emit("VERSION", version);
        })
        
        
        plugin.events.on("LOAD_SETTINGS", () => {
            this.debug("Loading settings for", plugin.name);
            plugin.settings = this.settingsHandler.getSettings().plugins.get(plugin.name);
        });
        
        plugin.events.on("SAVE_SETTINGS", async () => {
            this.debug("Saving settings for", plugin.name);
            // Add plugin to handler
            if(!this.settingsHandler.getSettings().plugins.has(plugin.name)) {
                this.settingsHandler.addPlugin(plugin.name);
            }
            for(const key of Object.keys(plugin.settings)) {
                this.debug("Changing", key, plugin.settings[key])
                this.settingsHandler.changePluginSetting(plugin.name, key, plugin.settings[key]);
            }
            this.debug("New Settings:", this.settingsHandler.getSettings())
            this.settingsHandler.writeToFile();
        })
        
        plugin.events.on("RESTART", () => {
            this.log("Stopping plugin:", plugin.name);
            plugin.stop();
            this.log("Waiting 5 seconds to restart:", plugin.name);
            setTimeout(() => {
                plugin.execute();
            }, 5000)
        })

        plugin.execute().then(() => {
            this.log("Plugin", plugin.name, "started!");
        }).catch(err => {
            this.error("Plugin", plugin.name, "failed starting:", err);
        })
    }

    /**
     * Removes Plugin-instance from plugins map which in turn
     * lets it get catched by garbage collection.
     * @param plugin The plugin instance to detach from plugins map
     */
    unloadPlugin(plugin: Plugin): void {
        this.debug(this.plugins.has(plugin.name));
        plugin.stop();
        if(this.plugins.has(plugin.name)) {
            this.plugins.delete(plugin.name);
            this.log("Plugin "+plugin.name+" unloaded!")
        }
    }

    /**
     * Adds a module instance to the modules map to keep
     * it in memory and allow runtime manipulation.
     * @param module A module instance to import to plugins map
     */
    async loadModule(module: Module): Promise<void> {
            this.debug("Module '"+module.name+"' starting!")
            const success = module.execute();
            if(!success) this.warn("Module " + module.name + " failed to start!")
    }

    /**
     * Removes Module-instance from plugins modules which in turn
     * lets it get catched by garbage collection.
     * @param module The modules instance to detach from modules map
     */
    unloadModule(module: Module): void {
        if(this.modules.has(module.name)) {
            module.stop();
            this.plugins.delete(module.name)
            this.log("Module "+module.name+" unloaded!")
        }
    }

    /**
     * Initializes Hahnrich-instance and loads all enabled Plugins and Modules
     * 
     */
    async init() {
        await this.settingsHandler.loadFromFile();
        // Show logo
        console.log(logo.toString())

        const plugins: Plugin[] = [];

        this.log("Version:", version);

        this.log("Initializing Plugins");

        // TODO: use something better than .. to get root path of project
        const pluginDir = path.join(__dirname, "..", "Plugins");
        
        const dirs = (await fs.readdir(pluginDir, {withFileTypes: true}))
        .filter(async dirent => dirent.isDirectory() || dirent.isSymbolicLink() && await (
            async (): Promise<boolean> => {
                return new Promise(async (resolve) => {
                    return resolve((await fs.stat(path.join(pluginDir, dirent.name))).isDirectory());
                })
            }
        ))

        for(const dirent of dirs) {
            this.log("Trying to import:", dirent.name);
            try {
                const file = await import(path.join(pluginDir, dirent.name, "/index.js"));
                this.debug("Trying to import[2]:", file.default.name);
                const plugin: Plugin = file.default as Plugin;
                plugins.push(plugin);
            } catch(err) {
                this.error("Error importing Plugin:", dirent.name);
                this.debug(err);
            }
        }

        this.debug("Loading", plugins.length, "plugins.");
        
        // Load Plugins
        plugins.forEach((plugin: Plugin) => {
            this.debug("Loading", plugin.name)
            this.loadPlugin(plugin);
        })

        // reference Hahnrich in the module parent class
        Module.controller = this;

        const modules: Module[] = [];

        (await fs.readdir("Modules", {withFileTypes: true}))
        .filter(dirent => dirent.isDirectory())
        .forEach(async (dirent) => {
            try {
                modules.push(await import("Modules/"+dirent.name+"/index.js"));
            } catch(err) {
                this.error("Error importing Module:", dirent.name);
                this.debug(err);
            }
        })

        // Load Modules
        modules.forEach(module => {
            this.loadModule(module);
        })
    }
}