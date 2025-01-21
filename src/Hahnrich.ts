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
        this.init();
        const keepAlive = setInterval(() => {
            // Keep Hahnrich alive
            if(!this.aliveCheck()) {
                this.log("Exiting Hahnrich, have a nice day! :)");
                clearInterval(keepAlive);
            }
        }, 10000);
    }

    /**
     * Checks if all processes exited on purpose.
     * @returns If Hahnrich should continue to run.
     */
    aliveCheck(): boolean {
        // Things to keep Hahnrich running for
        return (
            this.plugins.size > 0
        )
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
                this.startPlugin(plugin);
            }, 5000)
        })

        this.startPlugin(plugin);
    }

    async restartPlugin(plugin: Plugin, restartCounter: number, maxRestarts: number) {
        this.log("Waiting for", plugin.name, "to stop.");
        await plugin.stop();

        if(restartCounter++ < maxRestarts) {
            this.warn(`Restarting ${plugin.name}[${restartCounter}/${maxRestarts}].`)
            this.restartPlugin(plugin, restartCounter, maxRestarts);
        } else {
            this.error(`Reached restart limit, plugin ${plugin.name} disabled.`);
            this.unloadPlugin(plugin);
        }
    }

    startPlugin(plugin: Plugin) {
        const promise: Promise<void> = new Promise((resolve, reject) => {
            plugin.execute().then(() => {
                this.log("Plugin", plugin.name, "started!");
                return resolve()
            }).catch(err => {
                this.error("Plugin", plugin.name, "failed starting:", err);
                return reject()
            });
        });

        promise.catch((err) => {
            const maxRestarts = this.settingsHandler.getSettings().maxPluginRestarts;
            this.restartPlugin(plugin, 0, maxRestarts);
        })
    }

    /**
     * Removes Plugin-instance from plugins map which in turn
     * lets it get catched by garbage collection.
     * @param plugin The plugin instance to detach from plugins map
     */
    async unloadPlugin(plugin: Plugin) {
        this.log("Unloading plugin:", plugin.name);
        await plugin.stop();
        if(this.plugins.has(plugin.name)) {
            this.plugins.delete(plugin.name);
            this.log("Plugin "+plugin.name+" unloaded!")
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
    }
}