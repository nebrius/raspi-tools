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
var repoList;
function init(newConfig) {
    config = newConfig;
    repoList = fs_1.readdirSync(config.workspacePath)
        .map(function (name) { return ({ name: name, path: path_1.join(config.workspacePath, name) }); })
        .filter(function (repo) { return repo.name !== 'raspi-tools' && fs_1.existsSync(path_1.join(repo.path, 'package.json')); });
}
exports.init = init;
function getRepoList() {
    return repoList;
}
exports.getRepoList = getRepoList;
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