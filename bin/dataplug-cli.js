#!/usr/bin/env node

const path = require('path');

let collectionDir = process.env.DATAPLUG_COLLECTIONS_DIR || '';
if (!path.isAbsolute(collectionDir)) {
  collectionsDir = path.join(process.cwd(), collectionDir);
}

require('../lib')(collectionsDir)
  .argv;
