const _ = require('lodash');
const Ajv = require('ajv');
const readline = require('readline');
const chalk = require('chalk');
const {
  validate
} = require('@dataplug/dataplug');
const helpers = require('../helpers');

module.exports = (collectionModule) => {
  const collection = collectionModule.collection;
  const source = collectionModule.source;
  if (!collection || !source) {
    return;
  }

  let cli = {};

  cli.command = 'source';
  cli.describe = `Streams '${collection.name}' collection data to stdout`;
  cli.builder = (yargs) => {
    return helpers.configDeclarationToYargs(yargs, source.configDeclaration)
      .option('stop', {
        alias: 's',
        describe: 'Stop on invalid data with success'
      })
      .option('fail', {
        alias: 'f',
        describe: 'Fail on invalid data with failure',
      })
      .conflicts('stop', 'fail')
      .option('skip-validation', {
        alias: 't',
        describe: 'Skip output data validation'
      })
      .option('omit-invalid', {
        alias: 'o',
        describe: 'Omit invalid entries from output'
      });
  };
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
      processedEntriesCount: 0,
      invalidEntriesCount: 0,
      validEntriesCount: 0
    };
    const printProgress = () => {
      readline.clearLine(process.stderr, 0);
      process.stderr.write(chalk.yellow('?') + ` processed: ${progress.processedEntriesCount}\n`);

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
      setInterval(updateProgress, 100);
    }

    source.createOutput(argv)
      .then((output) => {
        output
          .on('end', () => {
            closeOutput();

            if (argv.progress) {
              updateProgress();
            }
            process.exit();
          })
          .on('error', (reason) => {
            if (reason) {
              console.error(chalk.red('!'), reason);
            }

            if (argv.fail) {
              if (process.exitCode === 0) {
                process.exitCode = 65; /* EX_DATAERR */
              }

              closeOutput();

              if (argv.progress) {
                updateProgress();
              }
              process.exit();
            }
          })
          .on('data', (entry) => {
            validationResult = !!argv.skipValidation || validator(entry);
            if (!validationResult) {
              progress.invalidEntriesCount += 1;
            } else {
              progress.validEntriesCount += 1;
            }
            progress.processedEntriesCount += 1;

            if (validationResult || (!validationResult && !argv.omitInvalid)) {
              outputEntry(entry);
            }

            if (!validationResult && (argv.fail || argv.stop)) {
              output.pause();
              output.destroy(new Error('Schema validation failed: ' + JSON.stringify(validator.errors)));
            }
          });
        output.resume();
      })
      .catch((reason) => {
        closeOutput();

        console.error(chalk.red('!'), reason);
        process.exit(70); /* EX_SOFTWARE */
      });
  };

  return cli;
};
