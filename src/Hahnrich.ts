import Module from "./Module";
import Plugin from "./Plugin";
import fs from "fs/promises";
import Logger from "./Utils/Logger";
import {version} from "./version";
import path, { dirname } from "path";

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


    emoji = '🐔'

    constructor() {
        super()
        Logger.HahnrichVersion = version;
        this.init();
    }

    /**
     * Adds a plugin instance to the plugins map to keep
     * it in memory and allow runtime manipulation.
     * @param plugin A plugin instance to import to plugins map
     */
    async loadPlugin(plugin: Plugin): Promise<void> {
        this.debug("Plugin '"+plugin.name+"' starting!")
        this.plugins.set(plugin.name, plugin);
        
        plugin.execute().then(() => {
            this.log("Plugin", plugin.name, "started!");
        }).catch(err => {
            this.error("Plugin", plugin.name, "failed starting =>", err);
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
        // Show logo
        console.log(logo.toString())

        const plugins: Plugin[] = [];

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

        // start EventListener
        Plugin.events.on("Restart", (plugin: Plugin) => {
            if(!plugin) this.error("No plugin for restart specified!");
            this.log("Restarting plugin:", plugin.name)
            this.debug("Unloading")
            this.unloadPlugin(plugin);
            this.debug("Loading")
            this.loadPlugin(plugin);
            this.log("Done reloading plugin");
            this.debug("Active Plugins:",JSON.stringify([...this.plugins], null, 4));
        })
    }
}