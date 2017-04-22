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

import { getRepoList, copyDir, IRepoInfo } from '../utils';
import { readFile } from 'fs';
import { join } from 'path';
import { map, parallel } from 'async';

interface ITypeInfo {
  repo: IRepoInfo;
  packageJSON: {
    dependencies: { [ dependency: string ]: string }
  };
  typePath: string;
}

interface IAsyncNext {
  (err: string | null, value: ITypeInfo | null): void;
}

function getTypeInfo(cb: (types: ITypeInfo[]) => void) {
  map(getRepoList(), (repo: IRepoInfo, next: IAsyncNext) => {
    readFile(join(repo.path, 'package.json'), 'utf8', (err, contents) => {
        if (err) {
          console.error(err);
          process.exit(-1);
        }
        const packageJSON = JSON.parse(contents);
        const typeInfo: ITypeInfo = {
          repo,
          packageJSON,
          typePath: ''
        };
        if (packageJSON.types) {
          typeInfo.typePath = join(repo.path, packageJSON.types);
        }
        next(null, typeInfo);
      });
  }, (err: string | null, results: ITypeInfo[]) => {
    if (err) {
      console.error(err);
      process.exit(-1);
    }
    cb(results);
  });
}

function updateTypes(types: ITypeInfo[]) {
  const tasks: AsyncFunction<undefined, undefined>[] = [];
  for (const type of types) {
    for (const dep in type.packageJSON.dependencies) {
      for (const possibleType of types) {
        if (possibleType.repo.name === dep && possibleType.typePath) {
          console.log(`Syncing ${dep} to ${type.repo.name}`);
          tasks.push((next) => {
            copyDir(possibleType.repo.path, join(type.repo.path, 'node_modules', dep), next);
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
  getTypeInfo(updateTypes);
}
