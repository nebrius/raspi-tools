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
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
const async_1 = require("async");
const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const chalk_1 = require("chalk");
let config;
const reposInfo = {};
function log(message) {
    console.log(message);
}
exports.log = log;
function warn(message) {
    console.warn(chalk_1.yellow(`WARNING: ${message}`));
}
exports.warn = warn;
function error(message) {
    if (typeof message === 'string') {
        console.error(chalk_1.red(`ERROR: ${message}`));
    }
    else {
        console.error(chalk_1.red(message.toString()));
    }
}
exports.error = error;
function init(newConfig, cb) {
    // Store the config for later use
    config = newConfig;
    async_1.parallel(fs_1.readdirSync(config.workspacePath).map((name) => (next) => {
        // First, we exclude this tool from the list
        if (name === 'raspi-tools') {
            next();
            return;
        }
        // Next, let's create the basic repo info (it may be discarded)
        const repoInfo = {
            name,
            path: path_1.join(config.workspacePath, name),
            typeDeclarationPath: '',
            packageJSON: { version: '' },
            dependencies: {}
        };
        // Next we check if package.json exists
        const packageJSONPath = path_1.join(repoInfo.path, 'package.json');
        fs_1.exists(packageJSONPath, (packageJSONExists) => {
            if (!packageJSONExists) {
                next();
                return;
            }
            // Now we read in package.json
            fs_1.readFile(packageJSONPath, 'utf8', (err, packgeJSONContents) => {
                if (err) {
                    error(err);
                    process.exit(-1);
                }
                try {
                    repoInfo.packageJSON = JSON.parse(packgeJSONContents);
                }
                catch (e) {
                    error(`Could not parse package.json for ${repoInfo.name}: ${e}`);
                    process.exit(-1);
                }
                // At this point, we know we have a valid repo, so save it
                reposInfo[repoInfo.name] = repoInfo;
                // Next, check if there are type declarations
                if (repoInfo.packageJSON.types) {
                    fs_1.exists(path_1.join(repoInfo.path, repoInfo.packageJSON.types), (typeDeclarationsExist) => {
                        if (!typeDeclarationsExist) {
                            error(`Type declaration file "${repoInfo.packageJSON.types}" does not exist`);
                            process.exit(-1);
                        }
                        repoInfo.typeDeclarationPath = repoInfo.packageJSON.types;
                        next();
                    });
                }
                else {
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
exports.init = init;
function checkForUnpublishedChanges(repoInfo, cb) {
    child_process_1.exec('git tag -l --sort=-refname', {
        cwd: repoInfo.path
    }, (err, stdout, stderr) => {
        if (err || stderr) {
            cb(err || new Error(stderr), undefined);
            return;
        }
        cb(undefined, stdout.toString().split('\n')[0] !== repoInfo.packageJSON.version);
    });
}
exports.checkForUnpublishedChanges = checkForUnpublishedChanges;
function checkForUncommittedChanges(repoPath, cb) {
    child_process_1.exec('git status', { cwd: repoPath }, (err, stdout, stderr) => {
        if (err || stderr) {
            cb(err || new Error(stderr), undefined);
            return;
        }
        cb(undefined, stdout.toString().indexOf('nothing to commit') === -1);
    });
}
exports.checkForUncommittedChanges = checkForUncommittedChanges;
function getReposInfo() {
    return reposInfo;
}
exports.getReposInfo = getReposInfo;
function recursiveCopy(sourcePath, destinationPath, cb) {
    fs_1.readdir(sourcePath, (err, files) => {
        if (err) {
            error(err);
            process.exit(-1);
        }
        const filteredFiles = files.filter((file) => ['node_modules', '.git', '.vscode'].indexOf(file) === -1);
        async_1.parallel(filteredFiles.map((file) => (next) => {
            const filePath = path_1.join(sourcePath, file);
            fs_1.stat(filePath, (statErr, stats) => {
                if (statErr) {
                    error(statErr);
                    process.exit(-1);
                }
                if (stats.isDirectory()) {
                    recursiveCopy(filePath, path_1.join(destinationPath, file), next);
                }
                else {
                    fs_1.exists(destinationPath, (exists) => {
                        function execute() {
                            fs_1.createReadStream(filePath).pipe(fs_1.createWriteStream(path_1.join(destinationPath, file))).on('finish', next);
                        }
                        if (!exists) {
                            mkdirp(destinationPath, execute);
                        }
                        else {
                            execute();
                        }
                    });
                }
            });
        }), cb);
    });
}
function copyDir(sourcePath, destinationPath, cb) {
    async_1.series([
        (next) => {
            fs_1.exists(destinationPath, (exists) => {
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
exports.copyDir = copyDir;
function getRepoNameForCWD() {
    const repoNames = Object.keys(getReposInfo());
    const dirName = path_1.basename(process.cwd());
    if (repoNames.indexOf(dirName) !== -1) {
        return dirName;
    }
    return undefined;
}
exports.getRepoNameForCWD = getRepoNameForCWD;
function pad(str, length) {
    while (str.length < length) {
        str += ' ';
    }
    return str;
}
exports.pad = pad;
//# sourceMappingURL=utils.js.map