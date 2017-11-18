"use strict";
/*
MIT License

Copyright (c) 2017 Bryan Hughes <bryan@nebri.us>

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
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const analyze_deps_1 = require("./commands/analyze_deps");
const generate_types_1 = require("./commands/generate_types");
const sync_1 = require("./commands/sync");
const publish_1 = require("./commands/publish");
const utils_1 = require("./utils");
const fs_1 = require("fs");
const path_1 = require("path");
const homeDir = require("user-home");
const CONFIG_FILE_PATH = path_1.join(homeDir, '.raspi-tools.rc');
if (!fs_1.existsSync(CONFIG_FILE_PATH)) {
    utils_1.error(`Config file "${CONFIG_FILE_PATH}" is missing`);
    process.exit(-1);
}
const config = JSON.parse(fs_1.readFileSync(CONFIG_FILE_PATH, 'utf8'));
if (!config.workspacePath) {
    utils_1.error(`Missing config entry "workspacePath"`);
    process.exit(-1);
}
if (!fs_1.existsSync(config.workspacePath)) {
    utils_1.error(`Workspace path "${config.workspacePath}" does not exist`);
    process.exit(-1);
}
if (!fs_1.existsSync(config.definitelyTypedPath)) {
    utils_1.error(`DefinitelyTyped path "${config.definitelyTypedPath}" does not exist`);
    process.exit(-1);
}
utils_1.init(config, () => {
    // tslint:disable-next-line:no-unused-expression
    yargs.usage('Usage: raspi-tools <command> [options]')
        .command({
        command: 'analyze-deps',
        aliases: ['d'],
        describe: 'Analyze the current state of dependencies',
        builder(yargs) {
            return yargs;
        },
        handler() {
            analyze_deps_1.run();
        }
    })
        .command({
        command: 'generate-types',
        aliases: ['g'],
        describe: 'Generates the DefinitelyTyped files for all modules',
        builder(yargs) {
            return yargs;
        },
        handler() {
            generate_types_1.run(config);
        }
    })
        .command({
        command: 'sync',
        aliases: ['s'],
        describe: 'Syncs a repo to a raspberry pi',
        builder(yargs) {
            const defaultRepo = utils_1.getRepoNameForCWD();
            let repoDefaultDescription;
            if (defaultRepo) {
                repoDefaultDescription = `cwd=${defaultRepo}`;
            }
            return yargs
                .option('repo', {
                alias: 'r',
                describe: 'The name of the repo to sync, e.g. "raspi-gpio"',
                default: defaultRepo,
                defaultDescription: repoDefaultDescription
            })
                .option('ip', {
                alias: 'i',
                describe: 'The IP address of the Raspberry Pi',
                default: '192.168.3.2',
                defaultDescription: '192.168.3.2'
            });
        },
        handler(argv) {
            sync_1.run(config, argv.repo, argv.ip);
        }
    })
        .command({
        command: 'publish',
        aliases: ['p'],
        describe: 'Publishes, syncs, and tags a new version of the specified repo',
        builder(yargs) {
            const defaultRepo = utils_1.getRepoNameForCWD();
            let repoDefaultDescription;
            if (defaultRepo) {
                repoDefaultDescription = `cwd=${defaultRepo}`;
            }
            return yargs
                .option('repo', {
                alias: 'r',
                describe: 'The name of the repo to sync, e.g. "raspi-gpio"',
                default: defaultRepo,
                defaultDescription: repoDefaultDescription
            })
                .demandOption(['repo']);
        },
        handler(argv) {
            publish_1.run(config, argv.repo);
        }
    })
        .demandCommand(1, 'You must specify a command with this tool')
        .help('h')
        .alias('h', 'help')
        .argv;
});
//# sourceMappingURL=cli.js.map