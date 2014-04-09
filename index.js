'use strict';

var esprima = require('esprima');
var estraverse = require('estraverse');

require('sugar');

function findDependencies(source) {
  var rootDeps = [];
  var modules = {};

  estraverse.traverse(esprima.parse(source), {
    leave: function (node, parent) {
      if (!isAngularModuleStatement(node)) {
        return;
      }

      var moduleName = parent.arguments[0].value;
      if (parent.arguments[1]) {
        // if already declared, will reset dependencies, like how angular behaves (latest declaration wins)
        modules[moduleName] = {
          name: moduleName,
          uses: parent.arguments[1].elements.map('value')
        };
      } else {
        rootDeps.push(moduleName);
      }
    }
  });

  // aggregates all root + sub depedencies, and remove ones that were declared locally
  rootDeps
    .add(
      Object.values(modules)
      .map('uses')
      .flatten())
    .unique()
    .subtract(Object.keys(modules));

  return [{uses: rootDeps}].concat(Object.values(modules));
}

function isAngularModuleStatement(node) {
  return node.type === 'MemberExpression' && node.object.name === 'angular' && node.property.name === 'module';
}

module.exports = findDependencies;
module.exports.isAngularModuleStatement = isAngularModuleStatement;
