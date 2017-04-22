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
var utils_1 = require("../utils");
var path_1 = require("path");
var semver_1 = require("semver");
var child_process_1 = require("child_process");
var chalk_1 = require("chalk");
function run(config) {
    var repos = utils_1.getRepoList();
    var dependencyMap = {};
    for (var _i = 0, repos_1 = repos; _i < repos_1.length; _i++) {
        var repo = repos_1[_i];
        // tslint:disable-next-line:no-require-imports
        var packagejson = require(path_1.join(repo.path, 'package.json'));
        dependencyMap[repo.name] = {
            version: packagejson.version,
            dependencies: {},
            uncommittedChanges: false,
            unpublishedChanges: false
        };
    }
    for (var _a = 0, repos_2 = repos; _a < repos_2.length; _a++) {
        var repo = repos_2[_a];
        // tslint:disable-next-line:no-require-imports
        var packagejson = require(path_1.join(repo.path, 'package.json'));
        var libraryDef = dependencyMap[repo.name];
        for (var dep in packagejson.dependencies) {
            if (dependencyMap[dep]) {
                libraryDef.dependencies[dep] = {
                    version: packagejson.dependencies[dep],
                    currentVersion: '',
                    upToDate: false
                };
            }
        }
    }
    for (var library in dependencyMap) {
        var libraryDef = dependencyMap[library];
        libraryDef.uncommittedChanges = child_process_1.execSync('git status', {
            cwd: path_1.join(config.workspacePath, library)
        }).toString().indexOf('nothing to commit') === -1;
        libraryDef.unpublishedChanges = child_process_1.execSync('git tag -l --sort=-refname', {
            cwd: path_1.join(config.workspacePath, library)
        }).toString().split('\n')[0] !== libraryDef.version;
        var statusHeader = library + ': ' + dependencyMap[library].version +
            (libraryDef.uncommittedChanges ? ', uncommitted changes ' : '') +
            (libraryDef.unpublishedChanges ? ', unpublished changes' : '');
        if (libraryDef.uncommittedChanges || libraryDef.unpublishedChanges) {
            statusHeader = chalk_1.red(statusHeader);
        }
        console.log(statusHeader);
        for (var dep in libraryDef.dependencies) {
            libraryDef.dependencies[dep].currentVersion = dependencyMap[dep].version;
            libraryDef.dependencies[dep].upToDate = semver_1.satisfies(dependencyMap[dep].version, libraryDef.dependencies[dep].version);
            var status_1 = void 0;
            if (libraryDef.dependencies[dep].upToDate) {
                status_1 = '  ' + dep + '';
            }
            else {
                status_1 = '  ' + dep;
                for (var i = status_1.length; i < 20; i++) {
                    status_1 += ' ';
                }
                status_1 += 'current: ' + libraryDef.dependencies[dep].currentVersion + '   package: ' + libraryDef.dependencies[dep].version;
                status_1 = chalk_1.red(status_1);
            }
            console.log(status_1);
        }
        console.log('');
    }
}
exports.run = run;
//# sourceMappingURL=analyze_deps.js.map