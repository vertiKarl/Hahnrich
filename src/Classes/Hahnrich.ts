import Module from "./Module";
import Plugin from "./Plugin";
import fs, { PathLike } from "fs";
import plugins from "./Plugins";
import modules from "./Modules";
import Logger from "./Logger";
import {version} from "../version";

export default class Hahnrich extends Logger {
    plugins: Map<String, Plugin> = new Map<String, Plugin>();
    private modules: Map<String, Module> = new Map<String, Module>();


    isDebug = true;
    emoji = '🐔'

    constructor() {
        super()
        Logger.HahnrichVersion = version;
        this.init();
    }

    async loadPlugin(plugin: Plugin): Promise<void> {
        this.debug("Plugin '"+plugin.name+"' starting!")
        this.plugins.set(plugin.name, plugin);
        
        plugin.execute().then(() => {
            this.log("Plugin", plugin.name, "started!");
        }).catch(err => {
            this.error("Plugin", plugin.name, "failed starting =>", err);
        })
    }

    unloadPlugin(plugin: Plugin): void {
        if(this.plugins.has(plugin.name)) {
            const success = plugin.stop();
            this.plugins.delete(plugin.name);
            if(!success) {
                this.warn("Plugin " + plugin.name + " failed to stop!")
            } else {
                this.log("Plugin "+plugin.name+" unloaded!")
            }
        }
    }

    async loadModule(module: Module): Promise<void> {
            this.debug("Module '"+module.name+"' starting!")
            const success = module.execute();
            if(!success) this.warn("Module " + module.name + " failed to start!")
    }

    unloadModule(module: Module): void {
        if(this.modules.has(module.name)) {
            module.stop();
            this.plugins.delete(module.name)
            this.log("Module "+module.name+" unloaded!")
        }
    }

    init(): void {
        // Show logo
        const logo = fs.readFileSync(__dirname + "/../../logo.txt", {encoding: "utf-8"})
        console.log(logo.toString())

        // Load Plugins
        plugins.forEach(plugin => {
            const instance = new (plugin)();
            this.loadPlugin(instance);
        })

        // Load Modules
        modules.forEach(module => {
            const instance = new (module);
            this.loadModule(instance);
        })
    }
}