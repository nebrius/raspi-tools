import { IRepoInfo, IConfig } from '../utils';
export declare function generateTypeDefinition(repoInfo: IRepoInfo, config: IConfig, cb: (err: Error | undefined, definitionFilePath: string | undefined) => void): void;
export declare function run(config: IConfig): void;
