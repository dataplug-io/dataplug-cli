#!/usr/bin/env node

const path = require('path')
const cli = require('../lib')

let collectionsFactory = process.env.DATAPLUG_COLLECTIONS_FACTORY
let collectionsDir = process.env.DATAPLUG_COLLECTIONS_DIR || ''

let builder = cli.build()
if (collectionsFactory) {
  builder = builder
    .usingCollectionFactory(require(path.join(process.cwd(), collectionsFactory)))
} else {
  if (!path.isAbsolute(collectionsDir)) {
    collectionsDir = path.join(process.cwd(), collectionsDir)
  }

  builder = builder
    .usingCollectionsFromDir(collectionsDir)
}

builder.process()
