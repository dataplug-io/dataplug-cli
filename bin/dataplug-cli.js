#!/usr/bin/env node

const path = require('path');

let collectionsFactory = process.env.DATAPLUG_COLLECTIONS_FACTORY;
let collectionsDir = process.env.DATAPLUG_COLLECTIONS_DIR || '';

if (collectionsFactory) {
  require('../lib')
    .fromFactory(require(path.join(process.cwd(), collectionsFactory)))
    .argv;
} else {
  if (!path.isAbsolute(collectionsDir)) {
    collectionsDir = path.join(process.cwd(), collectionsDir);
  }

  require('../lib')
    .fromDir(collectionsDir)
    .argv;
}
