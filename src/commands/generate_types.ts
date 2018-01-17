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

import { join, dirname } from 'path';
import { readFile, writeFile, existsSync } from 'fs';
import {
  getReposInfo,
  IRepoInfo,
  IConfig,
  log,
  warn,
  error,
  checkForUncommittedChanges,
  checkForUnpublishedChanges
} from '../utils';
import { series } from 'async';

import * as ts from 'typescript';

const VERSION_REGEX = /^([0-9]*)\.([0-9]*)\.([0-9]*)$/;

function generateHeader(repoInfo: IRepoInfo): string {
  const versionInfo = repoInfo.packageJSON.version.match(VERSION_REGEX);
  if (!versionInfo) {
    throw new Error(`Unable to parse version ${repoInfo.packageJSON.version} for package ${repoInfo.name}`);
  }
  return `// Type definitions for ${repoInfo.name} ${versionInfo[1]}.${versionInfo[2]}
// Project: https://github.com/nebrius/${repoInfo.name}
// Definitions by: Bryan Hughes <https://github.com/nebrius>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.1

`;
}

export function generateTypeDefinition(
  repoInfo: IRepoInfo,
  config: IConfig,
  cb: (err: Error | undefined, definitionFilePath: string | undefined) => void
): void {
  if (!repoInfo.typeDeclarationPath) {
    cb(undefined, undefined);
    return;
  }
  series([
    (next) => {
      checkForUncommittedChanges(repoInfo.path, (err, hasChanges) => {
        if (err) {
          next(err);
          return;
        }
        if (hasChanges) {
          warn(`${repoInfo.name} has uncommitted changes, skipping`);
          next(new Error());
          return;
        }
        next();
      });
    },
    (next) => {
      checkForUnpublishedChanges(repoInfo, (err, hasChanges) => {
        if (err) {
          next(err);
          return;
        }
        if (hasChanges) {
          warn(`${repoInfo.name} has unpublished changes, skipping`);
          next(new Error());
          return;
        }
        next();
      });
    }
  ], (err) => {
    if (err) {
      return;
    }

    const declarationDir = join(config.definitelyTypedPath, 'types', repoInfo.name);
    if (!existsSync(declarationDir)) {
      warn(`Could not find DefinitelyTyped entry for ${repoInfo.name}, skipping`);
      cb(undefined, undefined);
      return;
    }

    const typePath = join(repoInfo.path, repoInfo.packageJSON.types as string);
    readFile(typePath, (packageReadErr, sourceFileContents) => {
      if (packageReadErr) {
        error(`Could not read declaration file for ${repoInfo.name}`);
        error(packageReadErr);
        cb(packageReadErr, undefined);
        return;
      }
      const sourceFile = ts.createSourceFile(typePath, sourceFileContents.toString(), ts.ScriptTarget.ES2017, true);

      const renameMap: { [ name: string ]: string; } = {};
      const result = ts.transform(
        sourceFile, [
          (context) => (rootNode) => {
            function visit(node: ts.Node): ts.Node {
              if (node.modifiers) {
                node.modifiers = ts.createNodeArray(node.modifiers.filter(
                  (modifier) => modifier.kind !== ts.SyntaxKind.DeclareKeyword));
              }
              if (ts.isInterfaceDeclaration(node) && node.name.text[0] === 'I') {
                renameMap[node.name.text] = node.name.text.slice(1);
                node = ts.createInterfaceDeclaration(
                  node.decorators,
                  node.modifiers,
                  renameMap[node.name.text],
                  node.typeParameters,
                  node.heritageClauses,
                  node.members
                );
              }
              return ts.visitEachChild(node, visit, context);
            }
            return ts.visitNode(rootNode, visit);
          }
        ]
      );

      let declarationFile = generateHeader(repoInfo) + ts.createPrinter()
        .printNode(ts.EmitHint.SourceFile, result.transformed[0], sourceFile);

      for (const oldName in renameMap) {
        if (!renameMap.hasOwnProperty(oldName)) {
          continue;
        }
        declarationFile = declarationFile.replace(new RegExp(oldName, 'g'), renameMap[oldName]);
      }

      log(`Writing declaration file for ${repoInfo.name}`);
      const declarationFilePath = join(declarationDir, 'index.d.ts');
      writeFile(declarationFilePath, declarationFile, (writeDeclarationErr) => {
        if (writeDeclarationErr) {
          error(`Could not write declaration file for ${repoInfo.name}`);
          error(writeDeclarationErr);
          cb(writeDeclarationErr, undefined);
          return;
        }
        cb(writeDeclarationErr, declarationFilePath);
      });
    });

  });
}

export function run(config: IConfig) {
  const reposInfo = getReposInfo();
  for (const repoName in reposInfo) {
    if (!reposInfo.hasOwnProperty(repoName)) {
      continue;
    }
    const repoInfo = reposInfo[repoName];
    generateTypeDefinition(repoInfo, config, (err, declarationFilePath) => {
      if (!err && declarationFilePath) {
        checkForUncommittedChanges(dirname(declarationFilePath), (fileChangesErr, hasChanges) => {
          if (fileChangesErr) {
            error(fileChangesErr);
            return;
          }
          if (hasChanges) {
            warn(`DefinitelyTyped definition has changed for ${repoInfo.name}, you must publish these changes`);
          }
        });
      }
    });
  }
}
