export interface IConfig {
    workspacePath: string;
    definitelyTypedPath: string;
}
export interface IPackageJson {
    types?: string;
    dependencies?: {
        [name: string]: string;
    };
    devDependencies?: {
        [name: string]: string;
    };
    version: string;
}
export interface IRepoInfo {
    name: string;
    path: string;
    typeDeclarationPath: string;
    packageJSON: IPackageJson;
    dependencies: {
        [repoName: string]: IRepoInfo;
    };
}
export declare function crossSpawn(command: string, args: string[], cwd: string, cb: (err: Error | undefined, stdout: string, stderr: string) => void): void;
export declare function log(message: string): void;
export declare function warn(message: string): void;
export declare function error(message: string | Error): void;
export declare function init(newConfig: IConfig, cb: () => void): void;
export declare function checkForUnpublishedChanges(repoInfo: IRepoInfo, cb: (err: Error | undefined, hasChanges: boolean | undefined) => void): void;
export declare function checkForUncommittedChanges(dirPath: string, cb: (err: Error | undefined, hasChanges: boolean | undefined) => void): void;
export declare function getReposInfo(): {
    [repoName: string]: IRepoInfo;
};
export declare function copyDir(sourcePath: string, destinationPath: string, cb: () => void): void;
export declare function getRepoNameForCWD(): string | undefined;
export declare function pad(str: string, length: number): string;
