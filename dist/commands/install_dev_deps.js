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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const async_1 = require("async");
const utils_1 = require("../utils");
const semver_1 = require("semver");
const chalk_1 = require("chalk");
const update_types_1 = require("./update_types");
function getLatestVersions(cb) {
    const reposInfo = utils_1.getReposInfo();
    // Create the master list of dependencies
    console.log('Analyzing developer dependencies');
    const masterDepList = {};
    for (const repoName in reposInfo) {
        const repoInfo = reposInfo[repoName];
        if (!repoInfo.packageJSON.devDependencies) {
            continue;
        }
        for (const depName in repoInfo.packageJSON.devDependencies) {
            if (!masterDepList.hasOwnProperty(depName)) {
                masterDepList[depName] = '';
            }
        }
    }
    // Fetch the latest version of each dep in the master list
    const tasks = [];
    console.log('Determining the latest version of all developer dependencies');
    for (const depName in masterDepList) {
        tasks.push((next) => {
            child_process_1.exec(`npm info ${depName} version`, (err, stdout, stderr) => {
                if (err || stderr) {
                    console.log(err || stderr);
                    next(err || stderr);
                    return;
                }
                masterDepList[depName] = stdout.trim();
                next(undefined);
            });
        });
    }
    async_1.parallel(tasks, () => {
        cb(masterDepList);
    });
}
function checkDepVersions(latestVersions, cb) {
    const reposInfo = utils_1.getReposInfo();
    let hasPrintedHeader = false;
    for (const repoName in reposInfo) {
        let hasPrintedRepoName = false;
        const repoInfo = reposInfo[repoName];
        if (!repoInfo.packageJSON.devDependencies) {
            continue;
        }
        for (const depName in repoInfo.packageJSON.devDependencies) {
            const depVersionRange = repoInfo.packageJSON.devDependencies[depName];
            const latestVersion = latestVersions[depName];
            if (!semver_1.satisfies(latestVersion, depVersionRange)) {
                if (!hasPrintedHeader) {
                    hasPrintedHeader = true;
                    console.log(chalk_1.yellow('\nOut of date developer dependencies detected!'));
                }
                if (!hasPrintedRepoName) {
                    hasPrintedRepoName = true;
                    console.log(`\n${repoName}:`);
                }
                console.log(`  ${utils_1.pad(depName, 20)} ${utils_1.pad(depVersionRange, 8)} =/=   ${latestVersion}`);
            }
        }
    }
    if (hasPrintedHeader) {
        console.log('');
    }
    else {
        console.log('All developer dependencies up to date');
    }
    setImmediate(cb);
}
function installDeps() {
    const reposInfo = utils_1.getReposInfo();
    const tasks = [];
    console.log('Installing developer dependencies');
    for (const repoName in reposInfo) {
        const repoInfo = reposInfo[repoName];
        tasks.push((next) => {
            if (!repoInfo.packageJSON.devDependencies) {
                next();
                return;
            }
            const depList = [];
            for (const depName in repoInfo.packageJSON.devDependencies) {
                depList.push(`${depName}@${repoInfo.packageJSON.devDependencies[depName]}`);
            }
            if (!depList.length) {
                next();
                return;
            }
            child_process_1.spawn('npm', ['install', '--no-progress'].concat(depList), {
                cwd: repoInfo.path,
                stdio: 'inherit'
            }).on('close', next);
        });
    }
    async_1.parallel(tasks, () => update_types_1.run());
}
function run() {
    getLatestVersions((deps) => checkDepVersions(deps, () => installDeps()));
}
exports.run = run;
//# sourceMappingURL=install_dev_deps.js.map