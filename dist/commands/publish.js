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
const spawn = require("cross-spawn");
const path_1 = require("path");
const async_1 = require("async");
const generate_types_1 = require("./generate_types");
function run(config, repo) {
    const repoPath = path_1.join(config.workspacePath, repo);
    const repoInfo = utils_1.getReposInfo()[repo];
    const version = repoInfo.packageJSON.version;
    utils_1.log(`Publishing v${version} of ${repo}\n`);
    async_1.series([
        (next) => {
            utils_1.checkForUncommittedChanges(repoInfo.path, (err, hasChanges) => {
                if (err) {
                    next(err);
                    return;
                }
                if (hasChanges) {
                    utils_1.warn(`Uncommitted changes detected, skipping`);
                    next(`Uncommitted changes detected, skipping`);
                    return;
                }
                next();
            });
        },
        (next) => {
            utils_1.log('Pushing master to git\n');
            spawn('git', ['push', 'origin', 'master'], {
                stdio: 'inherit',
                cwd: repoPath
            }).on('close', next);
        },
        (next) => {
            utils_1.log('\nPublishing to npm\n');
            spawn('npm', ['publish'], {
                stdio: 'inherit',
                cwd: repoPath
            }).on('close', next);
        },
        (next) => {
            utils_1.log('\nTagging release\n');
            spawn('git', ['tag', '-a', version, '-m', `Published v${version} to npm`], {
                stdio: 'inherit',
                cwd: repoPath
            }).on('close', next);
        },
        (next) => {
            utils_1.log('Pushing tags to git\n');
            spawn('git', ['push', 'origin', '--tags'], {
                stdio: 'inherit',
                cwd: repoPath
            }).on('close', next);
        },
        (next) => {
            if (!repoInfo.typeDeclarationPath) {
                next();
                return;
            }
            utils_1.log('\nGenerating DefinitelyTyped definition file\n');
            generate_types_1.generateTypeDefinition(repoInfo, config, (getTypeDefinitionErr, definitionFilePath) => {
                if (getTypeDefinitionErr) {
                    utils_1.error(getTypeDefinitionErr);
                    next(getTypeDefinitionErr);
                    return;
                }
                if (typeof definitionFilePath !== 'string') {
                    utils_1.error(`Internal Error: 'generateTypeDefinition' returned (undefined, undefined)`);
                    return;
                }
                utils_1.log('\nChecking if the DefinitelyTyped definition needs updating\n');
                utils_1.checkForUncommittedChanges(path_1.dirname(definitionFilePath), (uncommittedChangesErr, hasChanges) => {
                    if (uncommittedChangesErr) {
                        utils_1.error(uncommittedChangesErr);
                        next(uncommittedChangesErr);
                        return;
                    }
                    if (hasChanges) {
                        utils_1.warn(`The DefinitelyTyped definition changed!`);
                    }
                });
            });
        }
    ], (err) => {
        if (!err) {
            utils_1.log('Finished');
        }
    });
}
exports.run = run;
//# sourceMappingURL=publish.js.map