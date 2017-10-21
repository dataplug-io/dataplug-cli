const _ = require('lodash');
const chalk = require('chalk');
const {
  Target,
  JsonStreamReader
} = require('@dataplug/dataplug');
const {
  printErrorAndExit
} = require('../command');
const Progress = require('../progress');
const helpers = require('../helpers');

let declaration = {
  command: 'target',
  describe: `Streams data from stdin to collection`
};
declaration.builder = (yargs, collection) => {
  yargs = yargs
    .option('progress', {
      alias: 'p',
      describe: 'Show progress in console'
    });

  if (collection && collection.target) {
    yargs = helpers.configDeclarationToYargs(yargs, collection.target.configDeclaration);
  }

  return yargs;
};
declaration.prerequisites = (collection) => {
  return collection.target;
}
declaration.handler = (collection, argv) => {
  if (!collection.target) {
    printErrorAndExit(`'${collection.name}' collection does not have a target`);
    return;
  }

  const progress = new Progress({
    consumed: (value) => chalk.green('↑') + ` consumed: ${value}`
  });
  progress.consumed = 0;
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
    .on('data', () => {
      progress.supplied += 1;
    })
    .on('end', () => {
      if (argv.progress) {
        progress.cancel();
      }
    })
    .pipe(collection.target.createInput(argv))
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel();
      }
      printErrorAndExit('Failed to submit data to target: ' + error ? error : 'no specific information', 65); /* EX_DATAERR */
      return;
    });
}

module.exports = declaration;