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

import { IConfig, getReposInfo } from '../utils';
import { spawn } from 'child_process';
import { join } from 'path';
import { series } from 'async';

export function run(config: IConfig, repo: string) {
  const repoPath = join(config.workspacePath, repo);
  const reposInfo = getReposInfo();
  const version = reposInfo[repo].packageJSON.version;

  console.log(`Publishing v${version} of ${repo}\n`);
  series([
    (next) => {
      console.log('Pushing master to git\n');
      spawn('git', [ 'push', 'origin', 'master' ], {
        stdio: 'inherit',
        cwd: repoPath
      }).on('close', next);
    },
    (next) => {
      console.log('\nPublishing to npm\n');
      spawn('npm', [ 'publish' ], {
        stdio: 'inherit',
        cwd: repoPath
      }).on('close', next);
    },
    (next) => {
      console.log('\nTagging release\n');
      spawn('git', [ 'tag', '-a', version, '-m', `Published v${version} to npm` ], {
        stdio: 'inherit',
        cwd: repoPath
      }).on('close', next);
    },
    (next) => {
      console.log('Pushing tags to git\n');
      spawn('git', [ 'push', 'origin', '--tags' ], {
        stdio: 'inherit',
        cwd: repoPath
      }).on('close', next);
    }
  ], () => {
    console.log('Finished');
  });
}
