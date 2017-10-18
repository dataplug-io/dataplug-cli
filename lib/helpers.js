/**
 * Converts parameter declaration to yargs option definition
 */
function parameterDeclarationToYargsOption(declaration) {
  let option = {};

  if (declaration.description) {
    option.describe = declaration.description;
  }
  if (declaration.type) {
    option.type = declaration.type;
  }
  if (declaration.enum) {
    option.choices = declaration.enum;
  }
  if (declaration.default) {
    option.default = declaration.default;
  }
  if (declaration.required) {
    option.demandOption = declaration.required;
  }
  if (declaration.conflicts) {
    option.conflicts = declaration.conflicts;
  }

  return option;
}

/**
 * Converts configuration declaration to yargs options
 *
 * @param {ConfigDeclaration} configDeclaration
 */
function configDeclarationToYargs(yargs, configDeclaration) {
  for (let parameter in configDeclaration) {
    let optionName = parameter.replace(/[A-Z]/g, (match) => {
      return '-' + match.toLowerCase();
    });
    yargs = yargs.option(optionName, parameterDeclarationToYargsOption(configDeclaration[parameter]));
  }
  return yargs;
}

module.exports = {
  configDeclarationToYargs
};
