const {
  printJson,
} = require('../command');

let declaration = {
  command: 'schema',
  describe: 'Prints collection schema to stdout'
};
declaration.builder = (yargs) => yargs
  .option('indent', {
    alias: 'i',
    describe: 'Prettify output JSON using given amount of spaces',
    type: 'integer'
  })
  .coerce('indent', value => {
    value = parseInt(value);
    return value ? value : undefined;
  });
declaration.prerequisites = (collection) => {
  return collection.schema;
}
declaration.handler = (collection, argv) => {
  if (!collection.schema) {
    printErrorAndExit(`'${collection.name}' collection does not have a schema`);
    return;
  }

  printJson(argv, collection.schema);
}

module.exports = declaration;
