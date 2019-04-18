import _ from 'lodash'
import path from 'path'
import requireDirectory from 'require-directory'
import yargs from 'yargs/yargs'

/**
 * CLI builder
 */
class Builder {

  private factory: any
  private collections: any
  private commands: any
  private customCommands: any

  /** @constructor */
  constructor () {
    this.factory = null
    this.collections = null
    this.commands = requireDirectory(module, path.join(__dirname, 'commands'))
    this.customCommands = {}
  }
  

  /**
   * Builds using collection factory
   *
   * @param {Builder~Factory} factory Collection factory
   * @returns {Builder} This instance for chaining
   */
  public usingCollectionFactory (factory: object): Builder {

    if (this.factory) {
      throw new Error('Already building using factory')
    }
    if (this.collections) {
      throw new Error('Already building using collections')
    }

    this.factory = factory

    return this
  }

  /**
   * Builds using collections from specified directory
   *
   * @param {string} directory Directory to look for collections in
   * @param {Boolean} [recursive=true] Perform recursive search or no
   * @returns {Builder} This instance for chaining
   */
  public usingCollectionsFromDir (directory: string, recursive: boolean = true): Builder {

    if (this.factory) {
      throw new Error('Already building using factory')
    }

    const collections = requireDirectory(module, directory, {
      recurse: recursive
    })
    this.collections = Object.assign({}, this.collections, collections)

    return this
  }

  /**
   * Builds using specified commands
   *
   * @param {Builder~Command[]} commands
   * @returns {Builder} This instance for chaining
   */
  public usingCommands (commands: object[]): Builder {

    this.commands = Object.assign({}, this.commands, commands)

    return this
  }

  /**
   * Builds using commands found in specified directory
   *
   * @param {string} directory Directory with commands
   * @param {Boolean} [recursive=true] Perform recursive search or no
   * @returns {Builder} This instance for chaining
   */
  public usingCommandsFromDir (directory: string, recursive: boolean = true): Builder {

    const commands = requireDirectory(module, directory, {
      recurse: recursive
    })
    this.commands = Object.assign({}, this.commands, commands)

    return this
  }

  /**
   * Builds using specified custom commands
   *
   * @param {Object[]} commands
   * @returns {Builder} This instance for chaining
   */
  public usingCustomCommands (commands: object[]): Builder {

    this.customCommands = Object.assign({}, this.customCommands, commands)

    return this
  }

  /**
   * Builds using custom commands found in specified directory
   *
   * @param {string} directory Directory with commands
   * @param {Boolean} [recursive=true] Perform recursive search or no
   * @returns {Builder} This instance for chaining
   */
  public usingCustomCommandsFromDir (directory: string, recursive: boolean = true): Builder {

    const commands = requireDirectory(module, directory, {
      recurse: recursive
    })
    this.customCommands = Object.assign({}, this.customCommands, commands)

    return this
  }

  /**
   * Converts CLI configuration to yargs instance
   *
   * @param {Object} [yargsInstance=undefined] Instance of yargs
   * @return {Object} Instance of yargs
   */
  public toYargs (yargsInstance: any = undefined): any {

    if (!yargsInstance) {
      yargsInstance = yargs()
    }

    yargsInstance = yargsInstance
      .strict()
      .wrap(Math.min(120, yargsInstance.terminalWidth()))
      .usage('Usage: $0 <command>')

    _.values(this.commands).forEach((command: any) => {
      command = this.commandToYargs(command)
      if (command) {
        yargsInstance = yargsInstance.command(command)
      }
    })

    _.values(this.customCommands).forEach(command => {
      yargsInstance = yargsInstance.command(command)
    })

    yargsInstance = yargsInstance
      .epilogue('For more information, visit https://dataplug.io')
      .demandCommand(1, 1, 'Please specify a command')
      .recommendCommands()
      // TODO: support .completion()
      .version()
      .help()

    return yargsInstance
  }

  /**
   * Parses the arguments specified usign yargs instance.
   *
   * Uses process arguments if arguments are not specified
   *
   * @param {string[]} [args=undefined] Arguments
   * @return {Object} Parsed arguments
   */
  public parse (args: any = undefined): object {

    if (!args) {
      args = process.argv.slice(2)
    }

    return this.toYargs().parse(args)
  }

  /**
   * Processes the arguments specified and handles concole
   *
   * Uses process arguments if arguments are not specified
   *
   * @param {string[]} [args=undefined] Arguments
   * @return {Object} Parsed arguments
   */
  public process (args: any = undefined): object {
    if (process.platform === 'win32') {
      require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      }).on('SIGINT', function () {
        (process as any).emit('SIGINT')
      })
    }

    return this.parse(args)
  }

  /**
   * Converts command to yargs command
   *
   * @param {Builder~Command} declaration Command declaration
   * @returns {Object} Yargs command
   */
  private commandToYargs (declaration: any): object | void {
    let cli: any = {}

    let prerequisitesMet = true
    if (declaration.prerequisites && this.collections) {
      prerequisitesMet = _.some(_.values(this.collections), (collection) => declaration.prerequisites(collection))
    } else if (declaration.prerequisites && this.factory) {
      prerequisitesMet = declaration.prerequisites(this.factory.genericCollection)
    }
    if (!prerequisitesMet) {
      return
    }

    cli.command = declaration.command
    if (this.factory) {
      cli.command += ' <collection>'
    }
    cli.describe = declaration.description
    cli.builder = (yargs: any): any => {
      yargs = yargs
          .usage(`Usage: $0 ${declaration.command} <collection> [options]`)

      if (this.collections) {
        _.values(this.collections).forEach((collection: any) => {
          if (declaration.prerequisites && !declaration.prerequisites(collection)) {
            return
          }

          let collectionCmd = {
            command: collection.name,
            describe: `Collection (from "${collection.origin}")`,
            builder: (yargs: any): any => declaration.builder(yargs, collection)
                .usage(`Usage: $0 ${declaration.command} ${collection.name} [options]`),
            handler: (argv: any): any => {
              return declaration.handler(argv, collection)
            }
          }

          yargs = yargs
              .command(collectionCmd)
        })

        yargs = yargs
            .demandCommand(1, 1, 'Please specify a collection')
      } else if (this.factory) {
        yargs = declaration.builder(yargs, this.factory.genericCollection)
            .positional('collection', {
              describe: 'Collection name',
              type: 'string'
            })
      }
      yargs = yargs
          .version(false)
          .epilogue('For more information, visit https://dataplug.io')

      return yargs
    }
    if (this.factory) {
      cli.handler = (argv: any): any => {
        const collection = this.factory.createCollection(argv.collection)
        return declaration.handler(argv, collection)
      }
    }

    return cli
  }
}

/**
 * @typedef {Object} Builder~Command
 */

export default Builder
