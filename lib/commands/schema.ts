import _ from 'lodash'
import { SchemaFlatter } from '@dataplug/dataplug-flatters'

let declaration = {
  command: 'schema',
  description: 'Prints collection schema to stdout',
  builder: null,
  prerequisites: null,
  handler: null
}
declaration.builder = (yargs: any): any => yargs
  .option('name', {
    alias: 'n',
    describe: 'Name of collection to use instead of default',
    type: 'string'
  })
  .option('indent', {
    alias: 'i',
    describe: 'Prettify output JSON using given amount of spaces',
    type: 'integer'
  })
  .coerce('indent', (value: string): number | undefined => {
    const parsedValue = Number.parseInt(value)
    return _.isNaN(parsedValue) ? undefined : parsedValue
  })
  .option('flat', {
    describe: 'Flatten schema'
  })
declaration.prerequisites = (collection: any): object| boolean => {
  return collection.schema
}
declaration.handler = (argv: any, collection: any): void => {
  let schema = collection.schema
  if (argv.flat) {
    schema = new SchemaFlatter().flattenToJsonSchema(schema, argv.name || collection.name)
  }

  const indent = argv.indent ? _.repeat(' ', argv.indent) : null
  process.stdout.write(JSON.stringify(schema, null, indent))
}

export default declaration