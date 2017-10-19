const _ = require('lodash');
const chalk = require('chalk');

/**
 * Prints JSON to stdout
 */
function printJson(argv, value) {
  const space = argv.indent ? _.repeat(' ', parseInt(argv.indent)) : null;
  process.stdout.write(JSON.stringify(value, null, space));
}

/**
 * Prints error message and exists the process
 */
function printErrorAndExit(message, defaultExitCode = 70 /* EX_SOFTWARE */ ) {
  console.error(chalk.red('!'), message);
  if (process.exitCode === 0) {
    process.exitCode = defaultExitCode;
  }
  process.exit();
}

module.exports = {
  printJson,
  printErrorAndExit
}
