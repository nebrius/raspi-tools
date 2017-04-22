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

import { readdirSync, exists, existsSync, readdir, stat, createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import { series, parallel } from 'async';
import * as rimraf from 'rimraf';
import * as mkdirp from 'mkdirp';

export interface IConfig {
  workspacePath: string;
}

export interface IRepoInfo {
  name: string;
  path: string;
}

let config: IConfig;
let repoList: IRepoInfo[];

export function init(newConfig: IConfig) {
  config = newConfig;
  repoList = readdirSync(config.workspacePath)
    .map((name) => ({ name, path: join(config.workspacePath, name) }))
    .filter((repo) => repo.name !== 'raspi-tools' && existsSync(join(repo.path, 'package.json')));
}

export function getRepoList(): IRepoInfo[] {
  return repoList;
}

function recursiveCopy(sourcePath: string, destinationPath: string, cb: () => void) {
  readdir(sourcePath, (err, files) => {
    if (err) {
      console.error(err);
      process.exit(-1);
    }
    const filteredFiles = files.filter((file) => [ 'node_modules', '.git', '.vscode' ].indexOf(file) === -1);
    parallel(filteredFiles.map((file) => (next: () => void) => {
      const filePath = join(sourcePath, file);
      stat(filePath, (statErr, stats) => {
        if (statErr) {
          console.error(statErr);
          process.exit(-1);
        }
        if (stats.isDirectory()) {
          recursiveCopy(filePath, join(destinationPath, file), next);
        } else {
          exists(destinationPath, (exists) => {
            function execute() {
              createReadStream(filePath).pipe(createWriteStream(join(destinationPath, file))).on('finish', next);
            }
            if (!exists) {
              mkdirp(destinationPath, execute);
            } else {
              execute();
            }
          });
        }
      });
    }), cb);
  });
}

export function copyDir(sourcePath: string, destinationPath: string, cb: () => void) {
  series([
    (next) => {
      exists(destinationPath, (exists) => {
        if (!exists) {
          next();
          return;
        }
        rimraf(destinationPath, next);
      });
    },
    (next) => {
      recursiveCopy(sourcePath, destinationPath, next);
    }
  ], cb);
}
