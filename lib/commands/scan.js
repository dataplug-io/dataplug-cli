const _ = require('lodash');
const Ajv = require('ajv');
const chalk = require('chalk');
const {
  Scanner,
  JsonStreamReader,
  JsonStreamWriter
} = require('@dataplug/dataplug');
const {
  printJson,
  printErrorAndExit
} = require('../command');
const Progress = require('../progress');

let declaration = {
  command: 'scan',
  describe: 'Scans collection data stream from stdin and output results'
};
declaration.builder = (yargs) => yargs
  .option('results', {
    alias: 'o',
    describe: 'Print the results in machine-readable format'
  })
  .option('progress', {
    alias: 'p',
    describe: 'Show progress in console'
  })
  .option('invert', {
    alias: 'r',
    describe: 'Invert valid and invalid meaning',
    type: 'boolean',
    default: false
  })
  .option('fail', {
    alias: 'f',
    describe: 'Fail on invalid data with failure',
  });
declaration.handler = (collection, argv) => {
  if (!collection.schema) {
    printErrorAndExit(`'${collection.name}' collection does not have a schema`);
    return;
  }

  const validator = new Ajv({
      allErrors: false
    })
    .compile(collection.schema);
  const progress = new Progress({
    scanned: (value) => chalk.yellow('?') + ` scanned: ${value}`,
    valid: (value) => chalk.green('✓') + ` valid: ${value}`,
    invalid: (value) => chalk.red('✗') + ` invalid: ${value}`
  });
  progress.scanned =
    progress.valid =
    progress.invalid = 0;
  if (argv.progress) {
    progress.start();
  }

  process.stdin
    .pipe(new JsonStreamReader())
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel();
      }
      printErrorAndExit('Failed to deserialize data as JSON: ' + error ? error : 'no specific information', 65); /* EX_DATAERR */
      return;
    })
    .pipe(new Scanner((data) => {
      const result = validator(data);
      if (argv.invert) {
        result = !result;
      }

      progress.scanned += 1;
      if (result) {
        progress.valid += 1;
      } else {
        progress.invalid += 1;
      }

      if (!result && argv.fail) {
        throw new Error(JSON.stringify(validator.errors));
      }
    }))
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel();
      }
      printErrorAndExit('Failed to process data: ' + error ? error : 'no specific information', 65); /* EX_DATAERR */
      return;
    })
    .on('end', () => {
      if (argv.progress) {
        progress.cancel();
      }

      if (argv.results) {
        printJson({
          scanned: progress.scanned,
          valid: progress.valid,
          invalid: progress.invalid
        });
      }
    })
    .resume();
}

module.exports = declaration;
