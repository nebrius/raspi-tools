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

import * as yargs from 'yargs';
import { run as runAnalyzeDeps } from './commands/analyze_deps';
import { run as runUpdateTypes } from './commands/update_types';
import { run as runSync } from './commands/sync';
import { init, IConfig } from './utils'
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as homeDir from 'user-home';

const CONFIG_FILE_PATH = join(homeDir, '.raspi-tools.rc');

if (!existsSync(CONFIG_FILE_PATH)) {
  console.error(`Error: config file "${CONFIG_FILE_PATH}" is missing`);
  process.exit(-1);
}
const config: IConfig = JSON.parse(readFileSync(CONFIG_FILE_PATH, 'utf8'));
if (!config.workspacePath) {
  console.error(`Error: missing config entry "workspacePath"`);
  process.exit(-1);
}
if (!existsSync(config.workspacePath)) {
  console.error(`Error: workspace path "${config.workspacePath}" does not exist`);
  process.exit(-1);
}

init(config);

// tslint:disable-next-line:no-unused-expression
yargs.usage('Usage: raspi-tools <command> [options]')
    .command({
      command: 'analyze-deps',
      aliases: [ 'd' ],
      describe: 'Analyze the current state of dependencies',
      builder(yargs) {
        return yargs;
      },
      handler() {
        runAnalyzeDeps(config);
      }
    })
    .command({
      command: 'update-types',
      aliases: [ 't' ],
      describe: 'Updates the type definition files for all modules',
      builder(yargs) {
        return yargs;
      },
      handler() {
        runUpdateTypes();
      }
    })
    .command({
      command: 'sync',
      aliases: [ 's' ],
      describe: 'Syncs a repo to a raspberry pi',
      builder(yargs) {
        return yargs
          .option('repo', {
            alias: 'r',
            describe: 'The name of the repo to sync, e.g. "raspi-gpio"'
          })
          .option('ip', {
            alias: 'i',
            describe: 'The IP address of the Raspberry Pi'
          })
          .demandOption([ 'repo', 'ip' ]);
      },
      handler(argv) {
        runSync(config, argv.repo, argv.ip);
      }
    })
    .demandCommand(1, 'You must specify a command with this tool')
    .help('h')
    .alias('h', 'help')
    .argv;
