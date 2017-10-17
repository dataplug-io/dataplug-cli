module.exports = (collectionModule) => {
  const collection = collectionModule.collection;
  if (!collection) {
    return;
  }

  let cli = {};

  cli.command = 'schema';
  cli.describe = `Prints '${collection.name}' collection schema to stdout`;
  cli.builder = (yargs) => {
    return yargs;
  };
  cli.handler = (argv) => {
    process.stdout.write(collection.schema);
  };

  return cli;
};
