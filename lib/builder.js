const _ = require('lodash')
const check = require('check-types')
const path = require('path')
const requireDirectory = require('require-directory')
const yargs = require('yargs/yargs')

/**
 * CLI builder
 */
class Builder {
  /** @constructor */
  constructor () {
    this._factory = null
    this._collections = null
    this._commands = requireDirectory(module, path.join(__dirname, 'commands'))
    this._customCommands = {}
  }

  /**
   * Builds using collection factory
   *
   * @param {Builder~Factory} factory Collection factory
   * @returns {Builder} This instance for chaining
   */
  usingCollectionFactory (factory) {
    check.assert.object(factory)

    if (this._factory) {
      throw new Error('Already building using factory')
    }
    if (this._collections) {
      throw new Error('Already building using collections')
    }

    this._factory = factory

    return this
  }

  /**
   * Builds using collections from specified directory
   *
   * @param {string} directory Directory to look for collections in
   * @param {Boolean} [recursive=true] Perform recursive search or no
   * @returns {Builder} This instance for chaining
   */
  usingCollectionsFromDir (directory, recursive = true) {
    check.assert.string(directory)
    check.assert.boolean(recursive)

    if (this._factory) {
      throw new Error('Already building using factory')
    }

    const collections = requireDirectory(module, directory, {
      recurse: recursive
    })
    this._collections = Object.assign({}, this._collections, collections)

    return this
  }

  /**
   * Builds using specified commands
   *
   * @param {Builder~Command[]} commands
   * @returns {Builder} This instance for chaining
   */
  usingCommands (commands) {
    check.assert.array.of.object(commands)

    this._commands = Object.assign({}, this._commands, commands)

    return this
  }

  /**
   * Builds using commands found in specified directory
   *
   * @param {string} directory Directory with commands
   * @param {Boolean} [recursive=true] Perform recursive search or no
   * @returns {Builder} This instance for chaining
   */
  usingCommandsFromDir (directory, recursive = true) {
    check.assert.string(directory)
    check.assert.boolean(recursive)

    const commands = requireDirectory(module, directory, {
      recurse: recursive
    })
    this._commands = Object.assign({}, this._commands, commands)

    return this
  }

  /**
   * Builds using specified custom commands
   *
   * @param {Object[]} commands
   * @returns {Builder} This instance for chaining
   */
  usingCustomCommands (commands) {
    check.assert.array.of.object(commands)

    this._customCommands = Object.assign({}, this._customCommands, commands)

    return this
  }

  /**
   * Builds using custom commands found in specified directory
   *
   * @param {string} directory Directory with commands
   * @param {Boolean} [recursive=true] Perform recursive search or no
   * @returns {Builder} This instance for chaining
   */
  usingCustomCommandsFromDir (directory, recursive = true) {
    check.assert.string(directory)
    check.assert.boolean(recursive)

    const commands = requireDirectory(module, directory, {
      recurse: recursive
    })
    this._customCommands = Object.assign({}, this._customCommands, commands)

    return this
  }

  /**
   * Converts CLI configuration to yargs instance
   *
   * @param {Object} [yargsInstance=undefined] Instance of yargs
   * @return {Object} Instance of yargs
   */
  toYargs (yargsInstance = undefined) {
    check.assert.maybe.object(yargsInstance)

    if (!yargsInstance) {
      yargsInstance = yargs()
    }

    yargsInstance = yargsInstance
      .strict()
      .wrap(Math.min(120, yargsInstance.terminalWidth()))
      .usage('Usage: $0 <command>')

    _.values(this._commands).forEach(command => {
      command = this._commandToYargs(command)
      if (command) {
        yargsInstance = yargsInstance.command(command)
      }
    })

    _.values(this._customCommands).forEach(command => {
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
  parse (args = undefined) {
    check.assert.maybe.array.of.string(args)

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
  process (args = undefined) {
    if (process.platform === 'win32') {
      require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      }).on('SIGINT', function () {
        process.emit('SIGINT')
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
  _commandToYargs (declaration) {
    let cli = {}

    let prerequisitesMet = true
    if (declaration.prerequisites && this._collections) {
      prerequisitesMet = _.some(_.values(this._collections), (collection) => declaration.prerequisites(collection))
    } else if (declaration.prerequisites && this._factory) {
      prerequisitesMet = declaration.prerequisites(this._factory.genericCollection)
    }
    if (!prerequisitesMet) {
      return
    }

    cli.command = declaration.command
    if (this._factory) {
      cli.command += ' <collection>'
    }
    cli.describe = declaration.description
    cli.builder = (yargs) => {
      yargs = yargs
          .usage(`Usage: $0 ${declaration.command} <collection> [options]`)

      if (this._collections) {
        _.values(this._collections).forEach(collection => {
          if (declaration.prerequisites && !declaration.prerequisites(collection)) {
            return
          }

          let collectionCmd = {
            command: collection.name,
            describe: `Collection (from "${collection.origin}")`,
            builder: (yargs) => declaration.builder(yargs, collection)
                .usage(`Usage: $0 ${declaration.command} ${collection.name} [options]`),
            handler: (argv) => {
              return declaration.handler(argv, collection)
            }
          }

          yargs = yargs
              .command(collectionCmd)
        })

        yargs = yargs
            .demandCommand(1, 1, 'Please specify a collection')
      } else if (this._factory) {
        yargs = declaration.builder(yargs, this._factory.genericCollection)
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
    if (this._factory) {
      cli.handler = (argv) => {
        const collection = this._factory.createCollection(argv.collection)
        return declaration.handler(argv, collection)
      }
    }

    return cli
  }
}

/**
 * @typedef {Object} Builder~Command
 */

module.exports = Builder
