const {
  printJson,
} = require('../command');

let declaration = {
  command: 'schema',
  describe: 'Prints collection schema to stdout'
};
declaration.builder = (yargs) => yargs;
declaration.handler = (collection, argv) => {
  if (!collection.schema) {
    printErrorAndExit(`'${collection.name}' collection does not have a schema`);
    return;
  }

  printJson(argv, collection.schema);
}

module.exports = declaration;
