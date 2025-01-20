const fs = require('fs');
const versionString = require('../package.json').version;

// clean dist folder
// https://stackoverflow.com/a/52526549

const path = "dist";

function deleteFolderRecursive(path) {
    if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
      fs.readdirSync(path).forEach(function(file, index) {
        var curPath = path + '/' + file;
  
        if (fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
  
      console.log(`Deleting directory "${path}"...`);
      fs.rmdirSync(path);
    }
}

deleteFolderRecursive("dist")

fs.writeFileSync(__dirname + "/../src/version.ts", `export const version = "${versionString}"`);