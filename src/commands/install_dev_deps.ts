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

import { exec, spawn } from 'child_process';
import { parallel } from 'async';
import { getReposInfo, pad } from '../utils';
import { satisfies } from 'semver';
import { yellow } from 'chalk';
import { run as runUpdateTypes } from './update_types';

function getLatestVersions(cb: (latestVersions: { [name: string]: string }) => void): void {
  const reposInfo = getReposInfo();

  // Create the master list of dependencies
  console.log('Analyzing developer dependencies');
  const masterDepList: { [ name: string ]: string } = {};
  for (const repoName in reposInfo) {
    const repoInfo = reposInfo[repoName];
    if (!repoInfo.packageJSON.devDependencies) {
      continue;
    }
    for (const depName in repoInfo.packageJSON.devDependencies) {
      if (!masterDepList.hasOwnProperty(depName)) {
        masterDepList[depName] = '';
      }
    }
  }

  // Fetch the latest version of each dep in the master list
  const tasks: ((cb: () => void) => void)[] = [];
  console.log('Determining the latest version of all developer dependencies');
  for (const depName in masterDepList) {
    tasks.push((next: (err: string | Error | undefined) => void) => {
      exec(`npm info ${depName} version`, (err, stdout, stderr) => {
        if (err || stderr) {
          console.log(err || stderr);
          next(err || stderr);
          return;
        }
        masterDepList[depName] = stdout.trim();
        next(undefined);
      });
    });
  }
  parallel(tasks, () => {
    cb(masterDepList);
  });
}

function checkDepVersions(latestVersions: { [name: string]: string }, cb: () => void): void {
  const reposInfo = getReposInfo();
  let hasPrintedHeader = false;
  for (const repoName in reposInfo) {
    let hasPrintedRepoName = false;
    const repoInfo = reposInfo[repoName];
    if (!repoInfo.packageJSON.devDependencies) {
      continue;
    }
    for (const depName in repoInfo.packageJSON.devDependencies) {
      const depVersionRange = repoInfo.packageJSON.devDependencies[depName];
      const latestVersion = latestVersions[depName];
      if (!satisfies(latestVersion, depVersionRange)) {
        if (!hasPrintedHeader) {
          hasPrintedHeader = true;
          console.log(yellow('\nWarning: out of date developer dependencies detected!'));
        }
        if (!hasPrintedRepoName) {
          hasPrintedRepoName = true;
          console.log(`\n${repoName}:`);
        }
        console.log(`  ${pad(depName, 20)} ${pad(depVersionRange, 8)} =/=   ${latestVersion}`);
      }
    }
  }
  if (hasPrintedHeader) {
    console.log('');
  } else {
    console.log('All developer dependencies up to date');
  }
  setImmediate(cb);
}

function installDeps(): void {
  const reposInfo = getReposInfo();
  const tasks: ((cb: () => void) => void)[] = [];
  console.log('Installing developer dependencies');
  for (const repoName in reposInfo) {
    const repoInfo = reposInfo[repoName];
    tasks.push((next: () => void) => {
      if (!repoInfo.packageJSON.devDependencies) {
        next();
        return;
      }
      const depList: string[] = [];
      for (const depName in repoInfo.packageJSON.devDependencies) {
        depList.push(`${depName}@${repoInfo.packageJSON.devDependencies[depName]}`);
      }
      if (!depList.length) {
        next();
        return;
      }
      spawn('npm', [ 'install', '--no-progress' ].concat(depList), {
        cwd: repoInfo.path,
        stdio: 'inherit'
      }).on('close', next);
    });
  }
  parallel(tasks, () => {
    console.log('\nSyncing raspi types:\n');
    runUpdateTypes()
  });
}

export function run() {
  getLatestVersions((deps) =>
    checkDepVersions(deps, () =>
      installDeps()
    )
  );
}
