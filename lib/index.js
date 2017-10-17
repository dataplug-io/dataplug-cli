const yargs = require('yargs');

function configureCollectionCli(collectionModule, pathToFile, filename) {
  const collection = collectionModule.collection;
  if (!collection) {
    //TODO: log
    return;
  }

  //TODO: log

  let cli = {};
  cli.command = collection.name;
  cli.describe = `Lists tools for '${collection.name}' collection`;
  cli.builder = (yargs) => {
    return yargs
      .commandDir(__dirname + '/tools', {
        visit: (toolModule, pathToFile, filename) => {
          if (typeof toolModule !== 'function') {
            return;
          }

          return toolModule(collectionModule);
        }
      })
      .demandCommand(1, 1, 'Please specify a tool as a command');
  };

  return cli;
}

function configureCli(collectionsDir) {
  return yargs
    .strict()
    .commandDir(collectionsDir, {
      visit: configureCollectionCli
    })
    .demandCommand(1, 1, 'Please specify a collection as a command')
    .option('indent', {
      alias: 'i',
      describe: 'Prettify output JSON using given amount of spaces',
      type: 'string'
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

module.exports = configureCli;
