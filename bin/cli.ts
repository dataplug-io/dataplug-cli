#!/usr/bin/env node

import { join, isAbsolute } from 'path'
import { build } from '../lib'

let collectionsFactory: any = process.env.DATAPLUG_COLLECTIONS_FACTORY
let collectionsDir: string = process.env.DATAPLUG_COLLECTIONS_DIR || ''

let builder = build()
if (collectionsFactory) {
  builder = builder
    .usingCollectionFactory(require(join(process.cwd(), collectionsFactory)))
} else {
  if (!isAbsolute(collectionsDir)) {
    collectionsDir = join(process.cwd(), collectionsDir)
  }

  builder = builder
    .usingCollectionsFromDir(collectionsDir)
}

builder.process()
