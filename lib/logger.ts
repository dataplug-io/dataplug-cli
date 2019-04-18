import _ from 'lodash'
import winston from 'winston'

winston.configure({
  transports: [
    new winston.transports.Console({
      stderrLevels: _.keys(winston.config.npm.levels)
    })
  ]
})

export default winston
