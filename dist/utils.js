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
var fs_1 = require("fs");
var path_1 = require("path");
var async_1 = require("async");
var rimraf = require("rimraf");
var mkdirp = require("mkdirp");
var config;
var reposInfo = {};
;
function init(newConfig, cb) {
    // Store the config for later use
    config = newConfig;
    async_1.parallel(fs_1.readdirSync(config.workspacePath).map(function (name) { return function (next) {
        // First, we exclude this tool from the list
        if (name === 'raspi-tools') {
            next();
            return;
        }
        // Next, let's create the basic repo info (it may be discarded)
        var repoInfo = {
            name: name,
            path: path_1.join(config.workspacePath, name),
            typeDeclarationPath: '',
            packageJSON: {},
            dependencies: {}
        };
        // Next we check if package.json exists
        var packageJSONPath = path_1.join(repoInfo.path, 'package.json');
        fs_1.exists(packageJSONPath, function (packageJSONExists) {
            if (!packageJSONExists) {
                next();
                return;
            }
            // Now we read in package.json
            fs_1.readFile(packageJSONPath, 'utf8', function (err, packgeJSONContents) {
                if (err) {
                    console.error(err);
                    process.exit(-1);
                }
                try {
                    repoInfo.packageJSON = JSON.parse(packgeJSONContents);
                }
                catch (e) {
                    console.error("Could not parse package.json for " + repoInfo.name + ": " + e);
                    process.exit(-1);
                }
                // At this point, we know we have a valid repo, so save it
                reposInfo[repoInfo.name] = repoInfo;
                // Next, check if there are type declarations
                if (repoInfo.packageJSON.types) {
                    fs_1.exists(path_1.join(repoInfo.path, repoInfo.packageJSON.types), function (typeDeclarationsExist) {
                        if (!typeDeclarationsExist) {
                            console.error("Type declaration file \"" + repoInfo.packageJSON.types + "\" does not exist");
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
    }; }), function () {
        for (var repoName in reposInfo) {
            var repoInfo = reposInfo[repoName];
            if (repoInfo.packageJSON.dependencies) {
                for (var dep in repoInfo.packageJSON.dependencies) {
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
// OH OH OH, new tool that pulls in type declaration files and automatically generates raspi-types package.
// Look into renaming packages in npm
function getReposInfo() {
    return reposInfo;
}
exports.getReposInfo = getReposInfo;
function recursiveCopy(sourcePath, destinationPath, cb) {
    fs_1.readdir(sourcePath, function (err, files) {
        if (err) {
            console.error(err);
            process.exit(-1);
        }
        var filteredFiles = files.filter(function (file) { return ['node_modules', '.git', '.vscode'].indexOf(file) === -1; });
        async_1.parallel(filteredFiles.map(function (file) { return function (next) {
            var filePath = path_1.join(sourcePath, file);
            fs_1.stat(filePath, function (statErr, stats) {
                if (statErr) {
                    console.error(statErr);
                    process.exit(-1);
                }
                if (stats.isDirectory()) {
                    recursiveCopy(filePath, path_1.join(destinationPath, file), next);
                }
                else {
                    fs_1.exists(destinationPath, function (exists) {
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
        }; }), cb);
    });
}
function copyDir(sourcePath, destinationPath, cb) {
    async_1.series([
        function (next) {
            fs_1.exists(destinationPath, function (exists) {
                if (!exists) {
                    next();
                    return;
                }
                rimraf(destinationPath, next);
            });
        },
        function (next) {
            recursiveCopy(sourcePath, destinationPath, next);
        }
    ], cb);
}
exports.copyDir = copyDir;
//# sourceMappingURL=utils.js.map