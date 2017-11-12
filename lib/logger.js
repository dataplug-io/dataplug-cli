const _ = require('lodash')
const winston = require('winston')

winston.configure({
  transports: [
    new winston.transports.Console({
      stderrLevels: _.keys(winston.config.npm.levels)
    })
  ]
})

module.exports = winston
