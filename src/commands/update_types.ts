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

import { getReposInfo, copyDir, IRepoInfo } from '../utils';
import { join } from 'path';
import { parallel } from 'async';

function updateTypes(reposInfo: { [ repoName: string ]: IRepoInfo }) {
  const tasks: AsyncFunction<undefined, undefined>[] = [];
  for (const repoName in reposInfo) {
    const repoInfo = reposInfo[repoName];
    if (repoInfo.packageJSON.dependencies) {
      for (const dep in repoInfo.packageJSON.dependencies) {
        const depInfo = reposInfo[dep];
        if (depInfo && depInfo.typeDeclarationPath) {
          console.log(`Syncing ${dep} to ${repoName}`);
          tasks.push((next) => {
            copyDir(depInfo.path, join(repoInfo.path, 'node_modules', dep), next);
          });
        }
      }
    }
  }
  parallel(tasks, () => {
    console.log('Done');
  });
}

export function run() {
  const reposInfo = getReposInfo();
  updateTypes(reposInfo);
}
