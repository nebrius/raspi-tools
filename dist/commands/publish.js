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
const child_process_1 = require("child_process");
const path_1 = require("path");
const async_1 = require("async");
function run(config, repo) {
    const repoPath = path_1.join(config.workspacePath, repo);
    const reposInfo = utils_1.getReposInfo();
    const version = reposInfo[repo].packageJSON.version;
    console.log(`Publishing v${version} of ${repo}\n`);
    async_1.series([
        (next) => {
            console.log('Pushing master to git\n');
            child_process_1.spawn('git', ['push', 'origin', 'master'], {
                stdio: 'inherit',
                cwd: repoPath
            }).on('close', next);
        },
        (next) => {
            console.log('\nPublishing to npm\n');
            child_process_1.spawn('npm', ['publish'], {
                stdio: 'inherit',
                cwd: repoPath
            }).on('close', next);
        },
        (next) => {
            console.log('\nTagging release\n');
            child_process_1.spawn('git', ['tag', '-a', version, '-m', `Published v${version} to npm`], {
                stdio: 'inherit',
                cwd: repoPath
            }).on('close', next);
        },
        (next) => {
            console.log('Pushing tags to git\n');
            child_process_1.spawn('git', ['push', 'origin', '--tags'], {
                stdio: 'inherit',
                cwd: repoPath
            }).on('close', next);
        }
    ], () => {
        console.log('Finished');
    });
}
exports.run = run;
//# sourceMappingURL=publish.js.map