module.exports = (Hahnrich) => {
    // Access Hahnrich functions and variables
    Hahnrich.plugins.forEach((name, code) => {
        console.log(name);
    })

    // add temporary plugins and child processes
    const file = "./plugins/test.js";
    startPlugin(file);

}