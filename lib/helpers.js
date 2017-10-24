const _ = require('lodash')
const moment = require('moment')

/**
 * Validates parameter value
 */
function validateParameterValue (parameter, type, format, value) {
  if (type === 'integer') {
    const parsedValue = Number.parseInt(value)
    if (_.isNaN(parsedValue)) {
      throw new Error(`Invalid "${parameter}" value: failed to parse "${value}" as integer`)
    }
    return parsedValue
  } else if (type === 'number') {
    const parsedValue = Number.parseFloat(value)
    if (_.isNaN(parsedValue)) {
      throw new Error(`Invalid "${parameter}" value: failed to parse "${value}" as number`)
    }
    return Number.isInteger(parsedValue) ? Number.parseInt(value) : parsedValue
  } else if (type === 'string' && format) {
    if (format === 'date-time' && !moment(value, moment.ISO_8601).isValid()) {
      throw new Error(`Invalid "${parameter}" value: failed to parse "${value}" as date-time string`)
    } else if (format === 'date' && !moment(value, 'YYYY-MM-DD').isValid()) {
      throw new Error(`Invalid "${parameter}" value: failed to parse "${value}" as date string`)
    }
    return value
  }

  return value
}

/**
 * Converts parameter declaration to yargs
 */
function parameterDeclarationToYargs (yargs, parameter, declaration) {
  const optionName = parameter.replace(/[A-Z]/g, (match) => {
    return '-' + match.toLowerCase()
  })

  let option = {}
  if (declaration.description) {
    option.describe = declaration.description
  }
  if (declaration.type) {
    if (declaration.type === 'integer') {
      option.type = 'number'
    } else {
      option.type = declaration.type
    }
  }
  if (declaration.enum) {
    option.choices = declaration.enum
  }
  if (declaration.default) {
    option.default = declaration.default
  }
  if (declaration.required) {
    option.demandOption = declaration.required
  }
  if (declaration.conflicts) {
    option.conflicts = declaration.conflicts
  }
  yargs = yargs.option(optionName, option)

  yargs = yargs.coerce(optionName, (value) => {
    if (declaration.type === 'array') {
      return _.map(value, (value) => {
        return validateParameterValue(`${optionName}[]`, declaration.item, declaration.format, value)
      })
    }

    return validateParameterValue(optionName, declaration.type, declaration.format, value)
  })

  return yargs
}

/**
 * Converts configuration declaration to yargs options
 *
 * @param {ConfigDeclaration} configDeclaration
 */
function configDeclarationToYargs (yargs, configDeclaration) {
  for (let parameter in configDeclaration) {
    yargs = parameterDeclarationToYargs(yargs, parameter, configDeclaration[parameter])
  }
  return yargs
}

module.exports = {
  configDeclarationToYargs
}
