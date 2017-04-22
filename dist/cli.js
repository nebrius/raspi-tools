/*
MIT License

Copyright (c) 2017 Bryan Hughes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var yargs = require("yargs");
var analyze_deps_1 = require("./commands/analyze_deps");
var update_types_1 = require("./commands/update_types");
var utils_1 = require("./utils");
var fs_1 = require("fs");
var path_1 = require("path");
var homeDir = require("user-home");
var CONFIG_FILE_PATH = path_1.join(homeDir, '.raspi-tools.rc');
if (!fs_1.existsSync(CONFIG_FILE_PATH)) {
    console.error("Error: config file \"" + CONFIG_FILE_PATH + "\" is missing");
    process.exit(-1);
}
var config = JSON.parse(fs_1.readFileSync(CONFIG_FILE_PATH, 'utf8'));
if (!config.workspacePath) {
    console.error("Error: missing config entry \"workspacePath\"");
    process.exit(-1);
}
if (!fs_1.existsSync(config.workspacePath)) {
    console.error("Error: workspace path \"" + config.workspacePath + "\" does not exist");
    process.exit(-1);
}
utils_1.init(config);
// tslint:disable-next-line:no-unused-expression
yargs.usage('Usage: raspi-tools <command> [options]')
    .command({
    command: 'analyze-deps',
    aliases: ['d'],
    describe: 'Analyze the current state of dependencies',
    builder: function (yargs) {
        return yargs;
    },
    handler: function () {
        analyze_deps_1.run(config);
    }
})
    .command({
    command: 'update-types',
    aliases: ['t'],
    describe: 'Updates the type definition files for all modules',
    builder: function (yargs) {
        return yargs;
    },
    handler: function () {
        update_types_1.run();
    }
})
    .help('h')
    .alias('h', 'help')
    .argv;
//# sourceMappingURL=cli.js.map