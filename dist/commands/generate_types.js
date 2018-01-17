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
const path_1 = require("path");
const fs_1 = require("fs");
const utils_1 = require("../utils");
const async_1 = require("async");
const ts = require("typescript");
const VERSION_REGEX = /^([0-9]*)\.([0-9]*)\.([0-9]*)$/;
function generateHeader(repoInfo) {
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
function generateTypeDefinition(repoInfo, config, cb) {
    if (!repoInfo.typeDeclarationPath) {
        cb(undefined, undefined);
        return;
    }
    async_1.series([
        (next) => {
            utils_1.checkForUncommittedChanges(repoInfo.path, (err, hasChanges) => {
                if (err) {
                    next(err);
                    return;
                }
                if (hasChanges) {
                    utils_1.warn(`${repoInfo.name} has uncommitted changes, skipping`);
                    next(new Error());
                    return;
                }
                next();
            });
        },
        (next) => {
            utils_1.checkForUnpublishedChanges(repoInfo, (err, hasChanges) => {
                if (err) {
                    next(err);
                    return;
                }
                if (hasChanges) {
                    utils_1.warn(`${repoInfo.name} has unpublished changes, skipping`);
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
        const declarationDir = path_1.join(config.definitelyTypedPath, 'types', repoInfo.name);
        if (!fs_1.existsSync(declarationDir)) {
            utils_1.warn(`Could not find DefinitelyTyped entry for ${repoInfo.name}, skipping`);
            cb(undefined, undefined);
            return;
        }
        const typePath = path_1.join(repoInfo.path, repoInfo.packageJSON.types);
        fs_1.readFile(typePath, (packageReadErr, sourceFileContents) => {
            if (packageReadErr) {
                utils_1.error(`Could not read declaration file for ${repoInfo.name}`);
                utils_1.error(packageReadErr);
                cb(packageReadErr, undefined);
                return;
            }
            const sourceFile = ts.createSourceFile(typePath, sourceFileContents.toString(), ts.ScriptTarget.ES2017, true);
            const renameMap = {};
            const result = ts.transform(sourceFile, [
                (context) => (rootNode) => {
                    function visit(node) {
                        if (node.modifiers) {
                            node.modifiers = ts.createNodeArray(node.modifiers.filter((modifier) => modifier.kind !== ts.SyntaxKind.DeclareKeyword));
                        }
                        if (ts.isInterfaceDeclaration(node) && node.name.text[0] === 'I') {
                            renameMap[node.name.text] = node.name.text.slice(1);
                            node = ts.createInterfaceDeclaration(node.decorators, node.modifiers, renameMap[node.name.text], node.typeParameters, node.heritageClauses, node.members);
                        }
                        return ts.visitEachChild(node, visit, context);
                    }
                    return ts.visitNode(rootNode, visit);
                }
            ]);
            let declarationFile = generateHeader(repoInfo) + ts.createPrinter()
                .printNode(ts.EmitHint.SourceFile, result.transformed[0], sourceFile);
            for (const oldName in renameMap) {
                if (!renameMap.hasOwnProperty(oldName)) {
                    continue;
                }
                declarationFile = declarationFile.replace(new RegExp(oldName, 'g'), renameMap[oldName]);
            }
            utils_1.log(`Writing declaration file for ${repoInfo.name}`);
            const declarationFilePath = path_1.join(declarationDir, 'index.d.ts');
            fs_1.writeFile(declarationFilePath, declarationFile, (writeDeclarationErr) => {
                if (writeDeclarationErr) {
                    utils_1.error(`Could not write declaration file for ${repoInfo.name}`);
                    utils_1.error(writeDeclarationErr);
                    cb(writeDeclarationErr, undefined);
                    return;
                }
                cb(writeDeclarationErr, declarationFilePath);
            });
        });
    });
}
exports.generateTypeDefinition = generateTypeDefinition;
function run(config) {
    const reposInfo = utils_1.getReposInfo();
    for (const repoName in reposInfo) {
        if (!reposInfo.hasOwnProperty(repoName)) {
            continue;
        }
        const repoInfo = reposInfo[repoName];
        generateTypeDefinition(repoInfo, config, (err, declarationFilePath) => {
            if (!err && declarationFilePath) {
                utils_1.checkForUncommittedChanges(path_1.dirname(declarationFilePath), (fileChangesErr, hasChanges) => {
                    if (fileChangesErr) {
                        utils_1.error(fileChangesErr);
                        return;
                    }
                    if (hasChanges) {
                        utils_1.warn(`DefinitelyTyped definition has changed for ${repoInfo.name}, you must publish these changes`);
                    }
                });
            }
        });
    }
}
exports.run = run;
//# sourceMappingURL=generate_types.js.map