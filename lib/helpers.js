/**
 * Converts parameter declaration to yargs option definition
 */
function parameterDeclarationToYargsOption(declaration) {
  let option = {};

  option.describe = declaration.description;
  option.type = declaration.type;
  option.default = declaration.default;
  option.demandOption = declaration.required;

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
  configDeclarationToYargs: configDeclarationToYargs
};
