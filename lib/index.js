const _ = require('lodash');
const requireDirectory = require('require-directory');
const yargs = require('yargs');

/**
 * Configures command CLI
 */
function configureCommandCli(declaration) {
  let cli = {};

  let prerequisitesMet = true;
  if (declaration.prerequisites && global.collections) {
    prerequisitesMet = _.some(_.values(global.collections), (collection) => declaration.prerequisites(collection));
  } else if (declaration.prerequisites && global.factory) {
    prerequisitesMet = declaration.prerequisites(global.factory.genericCollection);
  }
  if (!prerequisitesMet) {
    return;
  }

  cli.command = declaration.command;
  if (global.factory) {
    cli.command += ' <collection>'
  }
  cli.describe = declaration.describe;
  cli.builder = (yargs) => {
    yargs = yargs
      .usage(`Usage: $0 ${declaration.command} <collection> [options]`);

    if (global.collections) {
      for (let name in global.collections) {
        const collection = global.collections[name];

        if (declaration.prerequisites && !declaration.prerequisites(collection)) {
          continue;
        }

        let collectionCmd = {
          command: name,
          describe: `Collection name (from "${collection.origin}")`,
          builder: (yargs) => declaration.builder(yargs, collection)
            .usage(`Usage: $0 ${declaration.command} ${collection.name} [options]`),
          handler: (argv) => {
            return declaration.handler(collection, argv);
          }
        };

        yargs = yargs
          .command(collectionCmd)
      }

      yargs = yargs
        .demandCommand(1, 1, 'Please specify a collection');
    } else if (global.factory) {
      yargs = declaration.builder(yargs, global.factory.genericCollection)
        .positional('collection', {
          describe: 'Collection name',
          type: 'string'
        });
    }
    yargs = yargs
      .version(false)
      .epilogue('For more information, visit https://dataplug.io');

    return yargs;
  };
  if (global.factory) {
    cli.handler = (argv) => {
      const collection = global.factory.createCollection(argv.collection);
      return declaration.handler(collection, argv);
    }
  }

  return cli;
}

/**
 * Configures CLI using global.collections
 *
 * @returns {Object} yargs instance
 */
function configureCli() {
  if (process.platform === 'win32') {
    require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    }).on('SIGINT', function() {
      process.emit('SIGINT');
    });
  }

  return yargs
    .strict()
    .wrap(Math.min(120, yargs.terminalWidth()))
    .usage('Usage: $0 <command>')
    .commandDir('commands', {
      visit: (command) => {
        return configureCommandCli(command);
      }
    })
    .epilogue('For more information, visit https://dataplug.io')
    .demandCommand(1, 1, 'Please specify a command')
    .recommendCommands()
    //TODO: support .completion()
    .version()
    .help();
}

/**
 * Configures CLI using collections found in specified directoryy
 *
 * @param {string} collectionsDir Directory to search for collections in
 * @param {boolean} [recursive=true] Perform recursive search or no
 * @returns {Object} yargs instance
 */
function configureCliFromDir(collectionsDir, recursive = true) {
  global.collections = requireDirectory(module, collectionsDir);
  return configureCli();
};

/**
 * Configures CLI using declarator
 */
function configureCliFromFactory(factory) {
  global.factory = factory;
  return configureCli();
}

module.exports = {
  fromDir: configureCliFromDir,
  fromFactory: configureCliFromFactory,
};
