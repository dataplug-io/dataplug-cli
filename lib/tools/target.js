module.exports = (collectionModule) => {
  const collection = collectionModule.collection;
  const target = collectionModule.target;
  if (!collection || !target) {
    return;
  }

  let cli = {};

  cli.command = 'target';
  cli.describe = `Streams data from stdin to '${collection.name}' collection`;
  cli.builder = (yargs) => {
    return yargs;
  };
  cli.handler = (argv) => {
    //TODO: implement target
  };

  return cli;
};
