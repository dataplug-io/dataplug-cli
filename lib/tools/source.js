const _ = require('lodash');
const Ajv = require('ajv');
const readline = require('readline');
const chalk = require('chalk');
const {
  validate
} = require('@dataplug/dataplug');
const consts = require('../consts');
const helpers = require('../helpers');

module.exports = (collection) => {
  const source = collection.source;
  if (!source) {
    return;
  }

  let cli = {};

  cli.command = 'source';
  cli.describe = `Streams '${collection.name}' collection data to stdout`;
  cli.builder = (yargs) => helpers.configDeclarationToYargs(yargs, source.configDeclaration);
  cli.handler = (argv) => {
    const space = argv.indent ? _.repeat(' ', parseInt(argv.indent)) : null;
    let outputtedEntries = 0;
    const openOutput = () => {
      process.stdout.write('[');;
    };
    const outputEntry = (entry) => {
      if (outputtedEntries > 0) {
        process.stdout.write(',');
      }

      const entryAsJson = JSON.stringify(entry, null, space);
      process.stdout.write(entryAsJson);

      outputtedEntries += 1;
    };
    const closeOutput = () => {
      process.stdout.write(']\n');
    };
    openOutput();

    const printProgress = () => {
      readline.clearLine(process.stderr, 0);
      process.stderr.write(chalk.green('↑') + ` supplied: ${outputtedEntries}\n`);
    };
    const updateProgress = () => {
      readline.cursorTo(process.stderr, 0, null);
      readline.moveCursor(process.stderr, 0, -1);
      printProgress();
    };
    let updateProgressTimer = null;
    if (argv.progress) {
      printProgress();
      updateProgressTimer = setInterval(updateProgress, consts.PROGRESS_UPDATE_INTERVAL);
    }
    const stopUpdateProgressTimer = () => {
      if (updateProgressTimer) {
        clearInterval(updateProgressTimer);
      }
      updateProgressTimer = null;
    };

    source.createOutput(argv)
      .then((output) => {
        output
          .on('end', () => {
            stopUpdateProgressTimer();

            closeOutput();

            if (argv.progress) {
              updateProgress();
            }
            process.exit();
          })
          .on('error', (reason) => {
            stopUpdateProgressTimer();
            if (argv.progress) {
              updateProgress();
            }
            console.error(chalk.red('!'), reason ? reason : 'Unknown data error');

            closeOutput();

            if (process.exitCode === 0) {
              process.exitCode = 65; /* EX_DATAERR */
            }
            process.exit();
          })
          .on('data', (entry) => {
            outputEntry(entry);
          });
        output.resume();

        // https://nodejs.org/api/readline.html#readline_event_sigint
        if (process.platform === 'win32') {
          require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          }).on('SIGINT', function() {
            process.emit('SIGINT');
          });
        }
        process.on('SIGINT', function() {
          output.pause();
          output.destroy();
          closeOutput();

          stopUpdateProgressTimer();
          if (argv.progress) {
            updateProgress();
          }
          console.error('Stopping due to interrupt signal...');

          process.exit();
        });

      })
      .catch((reason) => {
        closeOutput();

        console.error(chalk.red('!'), reason ? reason : 'Unknown error');
        process.exit(70); /* EX_SOFTWARE */
      });
  };

  return cli;
};
