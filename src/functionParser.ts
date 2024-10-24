// functionParser.ts

import { SupportedRegion } from 'firebase-functions';
import glob from 'glob';
import { parse, ParsedPath } from 'path';
import { ParserOptions } from './models';

// enable short hand for console.log()
const { log } = console;
/**
 * Config for the {@link FunctionParser} constructor
 */ interface FunctionParserOptions {
  rootPath: string;
  exports: any;
  options?: ParserOptions;
  verbose?: boolean;
  regions?: Array<SupportedRegion>;
}
/**
 * This class helps with setting sup the exports for the cloud functions deployment.
 *
 * It takes in exports and then adds the required groups and their functions to it for deployment
 * to the cloud functions server.
 *
 * @export
 * @class FunctionParser
 */
export class FunctionParser {
  rootPath: string;

  enableCors: boolean;

  exports: any;

  verbose: boolean;

  regions: Array<SupportedRegion>;
  /**
   * Creates an instance of FunctionParser.
   * @param {FunctionParserOptions} [config]
   * @memberof FunctionParser
   */
  constructor(props: FunctionParserOptions) {
    const {
      rootPath,
      exports,
      options,
      verbose = false,
      regions = ['us-central1'],
    } = props;
    if (!rootPath) {
      throw new Error('rootPath is required to find the functions.');
    }

    this.rootPath = rootPath;
    this.exports = exports;
    this.verbose = verbose;
    this.regions = regions;
    // Set default option values for if not provided
    this.enableCors = options?.enableCors ?? false;
    let groupByFolder: boolean = options?.groupByFolder ?? true;
    let buildReactive: boolean = options?.buildReactive ?? true;

    if (buildReactive) {
      this.buildReactiveFunctions(groupByFolder);
    }
  }

  /**
   * Looks for all files with .function.js and exports them on the group they belong to
   *
   * @private
   * @param {boolean} groupByFolder
   * @memberof FunctionParser
   */
  private buildReactiveFunctions(groupByFolder: boolean) {
    if (this.verbose) log('Reactive Functions - Building...');

    // Get all the files that has .function in the file name
    const functionFiles: string[] = glob.sync(
      `${this.rootPath}/**/*.function.js`,
      {
        cwd: this.rootPath,
        ignore: './node_modules/**',
      }
    );

    functionFiles.forEach((file: string) => {
      const filePath: ParsedPath = parse(file);

      const directories: string[] = filePath.dir.split('/');

      const groupName: string = groupByFolder
        ? directories[directories.length - 2] || ''
        : directories[directories.length - 1] || '';

      const functionName = filePath.name.replace('.function', '');

      if (
        !process.env.FUNCTION_NAME ||
        process.env.FUNCTION_NAME === functionName
      ) {
        if (!this.exports[groupName]) this.exports[groupName] = {};
        if (this.verbose)
          log(`Reactive Functions - Added ${groupName}/${functionName}`);

        this.exports[groupName] = {
          ...this.exports[groupName],
          ...require(file),
        };
      }
    });
    if (this.verbose) log('Reactive Functions - Built');
  }
}
