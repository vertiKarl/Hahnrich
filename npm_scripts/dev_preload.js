const fs = require('fs');
const versionString = "devel-" + require('../package.json').version;

fs.writeFileSync(__dirname + "/../src/version.ts", `export const version = "${versionString}"`);