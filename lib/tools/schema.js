module.exports = (collection) => {
  if (!collection.schema) {
    return;
  }

  let cli = {};

  cli.command = 'schema';
  cli.describe = `Prints '${collection.name}' collection schema to stdout`;
  cli.builder = (yargs) => yargs;
  cli.handler = (argv) => {
    process.stdout.write(collection.schema);
  };

  return cli;
};
