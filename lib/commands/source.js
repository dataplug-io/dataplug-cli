const _ = require('lodash');
const chalk = require('chalk');
const {
  Source,
  JsonStreamWriter
} = require('@dataplug/dataplug');
const {
  printErrorAndExit
} = require('../command');
const Progress = require('../progress');
const helpers = require('../helpers');

let declaration = {
  command: 'source',
  describe: 'Streams collection data to stdout'
};
declaration.builder = (yargs, collection) => {
  yargs = yargs
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

  if (collection && collection.source) {
    yargs = helpers.configDeclarationToYargs(yargs, collection.source.configDeclaration);
  }

  return yargs;
};
declaration.prerequisites = (collection) => {
  return collection.source;
}
declaration.handler = (collection, argv) => {
  if (!collection.source) {
    printErrorAndExit(`'${collection.name}' collection does not have a source`);
    return;
  }

  const progress = new Progress({
    supplied: (value) => chalk.green('↑') + ` supplied: ${value}`
  });
  progress.supplied = 0;
  if (argv.progress) {
    progress.start();
  }

  const source = collection.source.createOutput(argv);
  const writer = new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', parseInt(argv.indent)) : null);

  process.on('SIGINT', function() {
    source.unpipe(writer);
    writer.end();
  });

  source
    .on('data', () => {
      progress.supplied += 1;
    })
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel();
      }
      printErrorAndExit('Failed to obtain data from source: ' + error ? error : 'no specific information', 65); /* EX_DATAERR */
      return;
    })
    .pipe(writer)
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
      process.exit();
    })
    .pipe(process.stdout);
}

module.exports = declaration;