const _ = require('lodash');
const Ajv = require('ajv');
const chalk = require('chalk');
const {
  Flatter,
  JsonStreamReader,
  JsonStreamWriter
} = require('@dataplug/dataplug');
const {
  printErrorAndExit
} = require('../command');
const Progress = require('../progress');

let declaration = {
  command: 'flatten',
  describe: 'Streams data from stdin to stdout, flattening it in-between'
};
declaration.builder = (yargs) => yargs
  .option('indent', {
    alias: 'i',
    describe: 'Prettify output JSON using given amount of spaces',
    type: 'integer'
  })
  .coerce('indent', value => {
    value = parseInt(value);
    return value ? value : undefined;
  })
  .option('progress', {
    alias: 'p',
    describe: 'Show progress in console'
  });
declaration.handler = (collection, argv) => {
  if (!collection.schema) {
    printErrorAndExit(`'${collection.name}' collection does not have a schema`);
    return;
  }

  const progress = new Progress({
    flattened: (value) => chalk.yellow('?') + ` flattened: ${value}`
  });
  progress.flattened = 0;
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
    .pipe(new Flatter(collection.schema))
    .on('data', () => {
      progress.flattened += 1;
    })
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel();
      }
      printErrorAndExit('Failed to flatten data: ' + error ? error : 'no specific information', 65); /* EX_DATAERR */
      return;
    })
    .pipe(new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', parseInt(argv.indent)) : null))
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel();
      }
      printErrorAndExit('Failed to serialize data as JSON: ' + error ? error : 'no specific information', 65); /* EX_DATAERR */
      return;
    })
    .on('end', () => {
      if (argv.progress) {
        progress.cancel();
      }
    })
    .pipe(process.stdout);
}

module.exports = declaration;
