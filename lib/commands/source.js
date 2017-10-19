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
    .option('progress', {
      alias: 'p',
      describe: 'Show progress in console'
    });

  if (collection && collection.source) {
    yargs = helpers.configDeclarationToYargs(yargs, collection.source.configDeclaration);
  }

  return yargs;
};
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

  collection.source.createOutput(argv)
    .on('data', () => {
      progress.supplied += 1;
    })
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel();
      }
      printErrorAndExit('Failed to obtain data from source', 65); /* EX_DATAERR */
      return;
    })
    .pipe(new JsonStreamWriter(undefined, argv.indent ? _.repeat(' ', parseInt(argv.indent)) : null))
    .on('error', (error) => {
      if (argv.progress) {
        progress.cancel();
      }
      printErrorAndExit('Failed to serialize data as JSON', 65); /* EX_DATAERR */
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

//TODO: support halting
//         // https://nodejs.org/api/readline.html#readline_event_sigint
//         if (process.platform === 'win32') {
//           require('readline').createInterface({
//             input: process.stdin,
//             output: process.stdout
//           }).on('SIGINT', function() {
//             process.emit('SIGINT');
//           });
//         }
//         process.on('SIGINT', function() {
//           output.pause();
//           output.destroy();
//           closeOutput();
//
//           stopUpdateProgressTimer();
//           if (argv.progress) {
//             updateProgress();
//           }
//           console.error('Stopping due to interrupt signal...');
//
//           process.exit();
//         });
