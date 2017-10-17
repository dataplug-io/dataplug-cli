module.exports = (collectionModule) => {
  const collection = collectionModule.collection;
  if (!collection) {
    return;
  }

  let cli = {};

  cli.command = 'validator';
  cli.describe = `Validates stream from stdin as \'${collection.name}\' collection data`;
  cli.builder = (yargs) => {
    return yargs
      .commandDir(__dirname + '/validator', {
        visit: (toolModule, pathToFile, filename) => {
          if (typeof toolModule !== 'function') {
            return;
          }

          return toolModule(collectionModule);
        }
      })
      .demandCommand(1, 1, 'Please specify a mode as a command')
      .option('stop', {
        alias: 's',
        describe: 'Stop on invalid data with success'
      })
      .option('fail', {
        alias: 'f',
        describe: 'Fail on invalid data with failure',
      })
      .conflicts('stop', 'fail');
  };

  return cli;
};
