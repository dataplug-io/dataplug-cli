import _ from 'lodash'
import moment from 'moment'

/**
 * Validates parameter value
 */
function validateParameterValue (parameter: string, type: 'string' | 'number' | 'integer', format: 'date-time' | 'date', value: any): any {
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
function parameterDeclarationToYargs (yargs: any, parameter: string, declaration: any): void {
  const optionName = _.kebabCase(parameter)

  let option: any = {}
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
  yargs.option(optionName, option)

  yargs.coerce(optionName, (value: any): any => {
    if (declaration.type === 'array') {
      return _.map(value, (value) => {
        return validateParameterValue(`${optionName}[]`, declaration.item, declaration.format, value)
      })
    }

    return validateParameterValue(optionName, declaration.type, declaration.format, value)
  })
}

/**
 * Converts configuration declaration to yargs options
 *
 * @param {ConfigDeclaration} configDeclaration
 */
function configDeclarationToYargs (yargs: any, configDeclaration: any): any {
  _.forOwn(configDeclaration, (parameter: any, parameterName: any) => {
    parameterDeclarationToYargs(yargs, parameterName, parameter)
  })
  return yargs
}

export default configDeclarationToYargs
