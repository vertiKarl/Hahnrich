const F = require('fs');
const child = require('child_process');

module.exports = class Hahnrich {
  MAX_RECURSION = 5;
  plugins = new Map();

  constructor() {
    console.time('total startup');

    console.time('init');
    this.init();
    console.timeEnd('init');

    console.time('load-config');
    this.loadConfig()
    console.timeEnd('load-config')

    console.time('load-plugins');
    this.loadPlugins();
    console.timeEnd('load-plugins');

    console.log("Plugins loaded:", Array.from(this.plugins.keys()))

    console.timeEnd('total startup');
    setInterval(() => {}, 90000000)
  }

  init() {
    // fancy console log
    let cl = console.log
    console.log = function() {
      let time = new Date()
      let log = [`\u001b[1m\u001b[42;1m\u001b[38;5;231mS\x1b[0m [${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}]`, `[\x1b[36m${'Hahnrich'}\x1b[0m]`]
      for(let arg in arguments) {
        log.push(arguments[arg])
      }
      cl.apply( console, log)
    }
    // fancy console module
    let cm = console.module
    console.module = function(mod) {
      let time = new Date()
      let log = [`\u001b[30;1m\u001b[48;5;208mM\u001b[0m [${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}]`, `[\x1b[36m${mod}\x1b[0m]`]
      for(let arg in arguments) {
        if(arg != 0) {
          log.push(arguments[arg])
        }
      }
      cl.apply( console, log)
    }
    // fancy console error
    let ce = console.error
    console.error = function() {
      let time = new Date()
      let error = [`\u001b[1m\u001b[41;1m\u001b[38;5;231mE\x1b[0m [${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}]`, `[\x1b[36m${'Hahnrich'}\x1b[0m]`]
      for(let arg in arguments) {
        error.push(arguments[arg])
      }
      ce.apply( console, error)
    }
    // fancy console debug
    let cd = console.debug
    console.debug = function() {
      let time = new Date()
      let debug = [`\u001b[1m\u001b[41;1m\u001b[38;5;231mD\x1b[0m [${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}]`, `[\x1b[36m${'Hahnrich'}\x1b[0m]`]
      for(let arg in arguments) {
        debug.push(arguments[arg])
      }
      cd.apply( console, debug)
    }
  }

  loadConfig() {
    try {
      this.config = JSON.parse(F.readFileSync('./config.json'))
    } catch (e) {
      if(e.code === "ENOENT") {
        console.log('creating config file')
        const configTemplate = {
          "ignorePlugins": ["test.js"]
        }
        F.writeFileSync('./config.json', JSON.stringify(configTemplate, null, 4))
        this.config = configTemplate;
      } else {
        console.error(e)
      }
    }
  }

  loadPlugins() {
    const Files = F.readdirSync('./plugins').filter(file => file.endsWith('.js'))
    for(const file of Files) {
      if(!this.config.ignorePlugins.includes(file)) {
        this.startPlugin(file)
      }
    }
  }

  startPlugin(file, recursion=0) {
    try {
      const name = file.replace('.js', '');
      const plugin = child.fork(`./plugins/${file}`, {silent: true})
      this.plugins.set(name, plugin)
      plugin.on('message', (msg) => {
        console.module(name, msg)
      })
      plugin.stderr.on('data', (err) => {
        console.error(`ERROR IN PLUGIN ${name}\n\u001b[48;5;88m\u001b[38;5;231m`+err+"\u001b[0m")
        if(recursion+1 < this.MAX_RECURSION) {
          this.startPlugin(file, recursion+1)
        } else {
          console.error(`ERROR IN PLUGIN ${name}\n\u001b[48;5;88m\u001b[38;5;231m`+"MAX RECURSION REACHED, STOPPING PROCESS"+"\u001b[0m")
        }
      })
      console.log(`Successfully started ${name}`)
    } catch(e) {
      console.error(`Failed starting ${name} (${e})`)
    }
  }
}
