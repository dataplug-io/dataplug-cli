const _ = require('lodash');
const Ajv = require('ajv');
const readline = require('readline');
const chalk = require('chalk');
const {
  validate
} = require('@dataplug/dataplug');
const consts = require('../consts');

module.exports = (collection) => {
  if (!collection.schema) {
    return;
  }

  let cli = {};

  cli.command = 'filter';
  cli.describe = `Streams data from stdin to stdout, filtering it as \'${collection.name}\' collection data`;
  cli.builder = (yargs) => yargs
    .option('dry-run', {
      alias: 'n',
      describe: 'Do not filter entries from the output data'
    })
    .option('invert', {
      alias: 'r',
      describe: 'Invert valid and invalid meaning',
      type: 'boolean',
      default: false
    })
    .option('stop', {
      alias: 's',
      describe: 'Stop on invalid data with success'
    })
    .option('fail', {
      alias: 'f',
      describe: 'Fail on invalid data with failure',
    })
    .conflicts('stop', 'fail');
  cli.handler = (argv) => {
    const validator = new Ajv({
        allErrors: false
      })
      .compile(collection.schema);

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

    let progress = {
      filteredEntriesCount: 0,
      invalidEntriesCount: 0,
      validEntriesCount: 0
    };
    const printProgress = () => {
      readline.clearLine(process.stderr, 0);
      process.stderr.write(chalk.yellow('?') + ` filtered: ${progress.filteredEntriesCount}\n`);

      readline.clearLine(process.stderr, 0);
      process.stderr.write(chalk.green('✓') + ` valid: ${progress.validEntriesCount}\n`);

      readline.clearLine(process.stderr, 0);
      process.stderr.write(chalk.red('✗') + ` invalid: ${progress.invalidEntriesCount}\n`);
    };
    const updateProgress = () => {
      readline.cursorTo(process.stderr, 0, null);
      readline.moveCursor(process.stderr, 0, -3);
      printProgress();
    };
    if (argv.progress) {
      printProgress();
      setInterval(updateProgress, consts.PROGRESS_UPDATE_INTERVAL);
    }

    validate(process.stdin, validator, (entry, validationResult) => {
        if (argv.invert) {
          validationResult = !validationResult;
        }

        if (!validationResult) {
          progress.invalidEntriesCount += 1;
        } else {
          progress.validEntriesCount += 1;
        }
        progress.filteredEntriesCount += 1;

        if (validationResult && !argv.dryRun) {
          outputEntry(entry);
        }

        if (!validationResult && (argv.fail || argv.stop)) {
          return false;
        }
      })
      .then((validationResult) => {
        if (argv.fail && progress.invalidEntriesCount > 0) {
          process.exitCode = 65; /* EX_DATAERR */
        }

        closeOutput();

        if (argv.progress) {
          updateProgress();
        }
        process.exit();
      })
      .catch((reason) => {
        closeOutput();

        console.error(chalk.red('!'), reason);
        process.exit(70); /* EX_SOFTWARE */
      });
  };

  return cli;
};
