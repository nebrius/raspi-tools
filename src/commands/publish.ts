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

import { IConfig, getReposInfo, log, warn, error, checkForUncommittedChanges } from '../utils';
import * as spawn from 'cross-spawn';
import { join, dirname } from 'path';
import { series } from 'async';
import { generateTypeDefinition } from './generate_types';

export function run(config: IConfig, repo: string) {
  const repoPath = join(config.workspacePath, repo);
  const repoInfo = getReposInfo()[repo];
  const version = repoInfo.packageJSON.version;

  log(`Publishing v${version} of ${repo}\n`);
  series([
    (next) => {
      checkForUncommittedChanges(repoInfo.path, (err, hasChanges) => {
        if (err) {
          next(err);
          return;
        }
        if (hasChanges) {
          warn(`Uncommitted changes detected, skipping`);
          next(new Error(`Uncommitted changes detected, skipping`));
          return;
        }
        next();
      });
    },
    (next) => {
      log('Pushing master to git\n');
      spawn('git', [ 'push', 'origin', 'master' ], {
        stdio: 'inherit',
        cwd: repoPath
      }).on('close', next);
    },
    (next) => {
      log('\nPublishing to npm\n');
      spawn('npm', [ 'publish' ], {
        stdio: 'inherit',
        cwd: repoPath
      }).on('close', next);
    },
    (next) => {
      log('\nTagging release\n');
      spawn('git', [ 'tag', '-a', version, '-m', `Published v${version} to npm` ], {
        stdio: 'inherit',
        cwd: repoPath
      }).on('close', next);
    },
    (next) => {
      log('Pushing tags to git\n');
      spawn('git', [ 'push', 'origin', '--tags' ], {
        stdio: 'inherit',
        cwd: repoPath
      }).on('close', next);
    },
    (next) => {
      if (!repoInfo.typeDeclarationPath) {
        next();
        return;
      }
      log('\nGenerating DefinitelyTyped definition file\n');
      generateTypeDefinition(repoInfo, config, (getTypeDefinitionErr, definitionFilePath) => {
        if (getTypeDefinitionErr) {
          error(getTypeDefinitionErr);
          next(getTypeDefinitionErr);
          return;
        }
        if (typeof definitionFilePath !== 'string') {
          error(`Internal Error: 'generateTypeDefinition' returned (undefined, undefined)`);
          return;
        }

        log('\nChecking if the DefinitelyTyped definition needs updating\n');
        checkForUncommittedChanges(dirname(definitionFilePath), (uncommittedChangesErr, hasChanges) => {
          if (uncommittedChangesErr) {
            error(uncommittedChangesErr);
            next(uncommittedChangesErr);
            return;
          }
          if (hasChanges) {
            warn(`The DefinitelyTyped definition changed!`);
          }
        });
      });
    }
  ], (err) => {
    if (!err) {
      log('Finished');
    }
  });
}
