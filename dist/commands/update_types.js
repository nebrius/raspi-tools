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
var utils_1 = require("../utils");
var path_1 = require("path");
var async_1 = require("async");
function updateTypes(reposInfo) {
    var tasks = [];
    var _loop_1 = function (repoName) {
        var repoInfo = reposInfo[repoName];
        if (repoInfo.packageJSON.dependencies) {
            var _loop_2 = function (dep) {
                var depInfo = reposInfo[dep];
                if (depInfo && depInfo.typeDeclarationPath) {
                    console.log("Syncing " + dep + " to " + repoName);
                    tasks.push(function (next) {
                        utils_1.copyDir(depInfo.path, path_1.join(repoInfo.path, 'node_modules', dep), next);
                    });
                }
            };
            for (var dep in repoInfo.packageJSON.dependencies) {
                _loop_2(dep);
            }
        }
    };
    for (var repoName in reposInfo) {
        _loop_1(repoName);
    }
    async_1.parallel(tasks, function () {
        console.log('Done');
    });
}
function run() {
    var reposInfo = utils_1.getReposInfo();
    updateTypes(reposInfo);
}
exports.run = run;
//# sourceMappingURL=update_types.js.map