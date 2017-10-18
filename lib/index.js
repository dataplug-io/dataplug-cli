const yargs = require('yargs');

function configureCollectionCli(collection, pathToFile, filename) {
  if (!collection.origin || !collection.name) {
    //TODO: log
    return;
  }

  //TODO: log

  let cli = {};
  cli.command = collection.name;
  cli.describe = `Lists tools for '${collection.name}' collection`;
  cli.builder = (yargs) => yargs
    .commandDir(__dirname + '/tools', {
      visit: (toolModule, pathToFile, filename) => {
        if (typeof toolModule !== 'function') {
          return;
        }

        return toolModule(collection);
      }
    })
    .demandCommand(1, 1, 'Please specify a tool as a command');

  return cli;
}

function configureCli(collectionsDir) {
  //TODO: support https://github.com/yargs/yargs/blob/master/docs/advanced.md#default-commands
  return yargs
    .strict()
    .commandDir(collectionsDir, {
      visit: configureCollectionCli
    })
    .demandCommand(1, 1, 'Please specify a collection as a command')
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
      describe: 'Show progress'
    })
    .wrap(Math.min(120, yargs.terminalWidth()))
    .help();
};

//TODO: export multiple methods .collectionsDir(), .collections(...arrayOfObjects), collections(function(name))
module.exports = configureCli;
