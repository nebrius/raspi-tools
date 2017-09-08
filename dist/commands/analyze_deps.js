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
const utils_1 = require("../utils");
const path_1 = require("path");
const semver_1 = require("semver");
const child_process_1 = require("child_process");
const chalk_1 = require("chalk");
function run(config) {
    const repos = utils_1.getReposInfo();
    const dependencyMap = {};
    for (const repoName in repos) {
        const repo = repos[repoName];
        // tslint:disable-next-line:no-require-imports
        const packagejson = require(path_1.join(repo.path, 'package.json'));
        dependencyMap[repo.name] = {
            version: packagejson.version,
            dependencies: {},
            uncommittedChanges: false,
            unpublishedChanges: false
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
    for (const library in dependencyMap) {
        const libraryDef = dependencyMap[library];
        libraryDef.uncommittedChanges = child_process_1.execSync('git status', {
            cwd: path_1.join(config.workspacePath, library)
        }).toString().indexOf('nothing to commit') === -1;
        libraryDef.unpublishedChanges = child_process_1.execSync('git tag -l --sort=-refname', {
            cwd: path_1.join(config.workspacePath, library)
        }).toString().split('\n')[0] !== libraryDef.version;
        let statusHeader = library + ': ' + dependencyMap[library].version +
            (libraryDef.uncommittedChanges ? ', uncommitted changes ' : '') +
            (libraryDef.unpublishedChanges ? ', unpublished changes' : '');
        if (libraryDef.uncommittedChanges || libraryDef.unpublishedChanges) {
            statusHeader = chalk_1.red(statusHeader);
        }
        console.log(statusHeader);
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
            console.log(status);
        }
        console.log('');
    }
}
exports.run = run;
//# sourceMappingURL=analyze_deps.js.map