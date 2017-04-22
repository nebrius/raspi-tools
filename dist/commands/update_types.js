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
var fs_1 = require("fs");
var path_1 = require("path");
var async_1 = require("async");
function getTypeInfo(cb) {
    async_1.map(utils_1.getRepoList(), function (repo, next) {
        fs_1.readFile(path_1.join(repo.path, 'package.json'), 'utf8', function (err, contents) {
            if (err) {
                console.error(err);
                process.exit(-1);
            }
            var packageJSON = JSON.parse(contents);
            var typeInfo = {
                repo: repo,
                packageJSON: packageJSON,
                typePath: ''
            };
            if (packageJSON.types) {
                typeInfo.typePath = path_1.join(repo.path, packageJSON.types);
            }
            next(null, typeInfo);
        });
    }, function (err, results) {
        if (err) {
            console.error(err);
            process.exit(-1);
        }
        cb(results);
    });
}
function updateTypes(types) {
    var tasks = [];
    var _loop_1 = function (type) {
        var _loop_2 = function (dep) {
            var _loop_3 = function (possibleType) {
                if (possibleType.repo.name === dep && possibleType.typePath) {
                    tasks.push(function (next) {
                        utils_1.copyDir(possibleType.repo.path, path_1.join(type.repo.path, 'node_modules', dep), next);
                    });
                }
            };
            for (var _i = 0, types_1 = types; _i < types_1.length; _i++) {
                var possibleType = types_1[_i];
                _loop_3(possibleType);
            }
        };
        for (var dep in type.packageJSON.dependencies) {
            _loop_2(dep);
        }
    };
    for (var _i = 0, types_2 = types; _i < types_2.length; _i++) {
        var type = types_2[_i];
        _loop_1(type);
    }
    async_1.parallel(tasks, function () {
        console.log('Done');
    });
}
function run() {
    getTypeInfo(updateTypes);
}
exports.run = run;
//# sourceMappingURL=update_types.js.map