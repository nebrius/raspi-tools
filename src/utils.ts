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

import { readdirSync, exists, readdir, readFile, stat, createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import { series, parallel } from 'async';
import * as rimraf from 'rimraf';
import * as mkdirp from 'mkdirp';

export interface IConfig {
  workspacePath: string;
}

export interface IPackageJson {
  types?: string;
  dependencies?: { [ name: string ]: string };
}

export interface IRepoInfo {
  name: string;
  path: string;
  typeDeclarationPath: string;
  packageJSON: IPackageJson;
  dependencies: { [ repoName: string ]: IRepoInfo };
}

let config: IConfig;
const reposInfo: { [ repoName: string ]: IRepoInfo } = {};;

export function init(newConfig: IConfig, cb: () => void) {

  // Store the config for later use
  config = newConfig;

  parallel(readdirSync(config.workspacePath).map((name) => (next: () => void) => {

    // First, we exclude this tool from the list
    if (name === 'raspi-tools') {
      next();
      return;
    }

    // Next, let's create the basic repo info (it may be discarded)
    const repoInfo: IRepoInfo = {
      name,
      path: join(config.workspacePath, name),
      typeDeclarationPath: '',
      packageJSON: {},
      dependencies: {}
    };

    // Next we check if package.json exists
    const packageJSONPath = join(repoInfo.path, 'package.json');
    exists(packageJSONPath, (packageJSONExists) => {
      if (!packageJSONExists) {
        next();
        return;
      }

      // Now we read in package.json
      readFile(packageJSONPath, 'utf8', (err, packgeJSONContents) => {
        if (err) {
          console.error(err);
          process.exit(-1);
        }
        try {
          repoInfo.packageJSON = JSON.parse(packgeJSONContents);
        } catch(e) {
          console.error(`Could not parse package.json for ${repoInfo.name}: ${e}`);
          process.exit(-1);
        }

        // At this point, we know we have a valid repo, so save it
        reposInfo[repoInfo.name] = repoInfo;

        // Next, check if there are type declarations
        if (repoInfo.packageJSON.types) {
          exists(join(repoInfo.path, repoInfo.packageJSON.types), (typeDeclarationsExist) => {
            if (!typeDeclarationsExist) {
              console.error(`Type declaration file "${repoInfo.packageJSON.types}" does not exist`);
              process.exit(-1);
            }
            repoInfo.typeDeclarationPath = <string>repoInfo.packageJSON.types;
            next();
          });
        } else {
          next();
        }
      });
    });
  }), () => {
    for (const repoName in reposInfo) {
      const repoInfo = reposInfo[repoName];
      if (repoInfo.packageJSON.dependencies) {
        for (const dep in repoInfo.packageJSON.dependencies) {
          if (dep in reposInfo) {
            repoInfo.dependencies[dep] = reposInfo[dep];
          }
        }
      }
    }
    cb();
  });
}

// OH OH OH, new tool that pulls in type declaration files and automatically generates raspi-types package.

// Look into renaming packages in npm

export function getReposInfo(): { [ repoName: string ]: IRepoInfo } {
  return reposInfo;
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
