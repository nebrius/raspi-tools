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
const utils_1 = require("../utils");
const path_1 = require("path");
const semver_1 = require("semver");
const chalk_1 = require("chalk");
const async_1 = require("async");
function run() {
    const repos = utils_1.getReposInfo();
    const dependencyMap = {};
    for (const repoName in repos) {
        const repoInfo = repos[repoName];
        // tslint:disable-next-line:no-require-imports
        const packagejson = require(path_1.join(repoInfo.path, 'package.json'));
        dependencyMap[repoInfo.name] = {
            version: packagejson.version,
            dependencies: {},
            repoInfo
        };
    }
    for (const repoName in repos) {
        const repo = repos[repoName];
        // tslint:disable-next-line:no-require-imports
        const packagejson = require(path_1.join(repo.path, 'package.json'));
        const libraryDef = dependencyMap[repo.name];
        for (const dep in packagejson.dependencies) {
            if (dependencyMap[dep]) {
                libraryDef.dependencies[dep] = {
                    version: packagejson.dependencies[dep],
                    currentVersion: '',
                    upToDate: false
                };
            }
        }
    }
    const repoTasks = [];
    for (const library in dependencyMap) {
        repoTasks.push((next) => {
            const libraryDef = dependencyMap[library];
            async_1.series([
                (changesNext) => {
                    utils_1.checkForUnpublishedChanges(libraryDef.repoInfo, (err, hasChanges) => {
                        if (err) {
                            changesNext(err);
                            return;
                        }
                        changesNext(undefined, hasChanges);
                    });
                },
                (changesNext) => {
                    utils_1.checkForUncommittedChanges(libraryDef.repoInfo.path, (err, hasChanges) => {
                        if (err) {
                            changesNext(err);
                            return;
                        }
                        changesNext(undefined, hasChanges);
                    });
                }
            ], (err, results) => {
                if (err) {
                    next(err, undefined);
                    return;
                }
                const [hasUnpublishedChanges, hasUncommittedChanges] = results;
                let statusHeader = library + ': ' + dependencyMap[library].version +
                    (hasUncommittedChanges ? ', uncommitted changes ' : '') +
                    (hasUnpublishedChanges ? ', unpublished changes' : '');
                if (hasUncommittedChanges || hasUnpublishedChanges) {
                    statusHeader = chalk_1.red(statusHeader);
                }
                utils_1.log(statusHeader);
                for (const dep in libraryDef.dependencies) {
                    libraryDef.dependencies[dep].currentVersion = dependencyMap[dep].version;
                    libraryDef.dependencies[dep].upToDate = semver_1.satisfies(dependencyMap[dep].version, libraryDef.dependencies[dep].version);
                    let status;
                    if (libraryDef.dependencies[dep].upToDate) {
                        status = '  ' + dep + '';
                    }
                    else {
                        status = '  ' + dep;
                        for (let i = status.length; i < 20; i++) {
                            status += ' ';
                        }
                        status += 'current: ' + libraryDef.dependencies[dep].currentVersion + '   package: ' + libraryDef.dependencies[dep].version;
                        status = chalk_1.red(status);
                    }
                    utils_1.log(status);
                }
                utils_1.log('');
                next(undefined, undefined);
            });
        });
    }
    async_1.parallel(repoTasks, () => { });
}
exports.run = run;
//# sourceMappingURL=analyze_deps.js.map