module.exports = (collection) => {
  const target = collection.target;
  if (!target) {
    return;
  }

  let cli = {};

  cli.command = 'target';
  cli.describe = `Streams data from stdin to '${collection.name}' collection`;
  cli.builder = (yargs) => yargs;
  cli.handler = (argv) => {
    //TODO: implement target
  };

  return cli;
};
