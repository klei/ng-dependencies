'use strict';

var esprima = require('esprima');
var estraverse = require('estraverse');

require('sugar');

function parseOptions(opts) {
  var defaultOpts = {
    // default options
  };
  return Object.merge(defaultOpts, (opts || {}));
}

function findDependencies(source, opts) {
  opts = parseOptions(opts);

  var rootDeps = [];
  var modules = {};

  estraverse.traverse(esprima.parse(source), {
    leave: function(node, parent) {
      if (!isAngularModuleStatement(node)) {
        if (isNgModuleDeclaration(node)) {
          modules['ng'] = [];
        }
        return;
      }

      var moduleName = parent.arguments[0].value;
      if (parent.arguments[1]) {
        // if already declared, will reset dependencies, like how angular behaves (latest declaration wins)
        modules[moduleName] = parent.arguments[1].elements.map('value');
      } else {
        rootDeps.push(moduleName);
      }
    }
  });

  // aggregates all root + sub depedencies, and remove ones that were declared locally
  rootDeps
    .add(
      Object.values(modules)
      .flatten())
    .unique();
  rootDeps = rootDeps.subtract(Object.keys(modules));

  var isAngular = Object.keys(modules).length > 0 || rootDeps.length > 0;
  if (isAngular && !Object.has(modules, 'ng') && !rootDeps.any('ng')) {
    rootDeps.unshift('ng');
  }

  var ret = {
    dependencies: rootDeps,
    modules: modules
  }

  return ret;
}

function isAngularModuleStatement(node) {
  return node.type === 'MemberExpression' && node.object.name === 'angular' && node.property.name === 'module';
}

function isNgModuleDeclaration(node) {
  return node.type === 'CallExpression' && node.callee.name === 'angularModule' && node.arguments.length > 0 && node.arguments[0].value === 'ng';
}

module.exports = findDependencies;
module.exports.isAngularModuleStatement = isAngularModuleStatement;
module.exports.isNgModuleDeclaration = isNgModuleDeclaration;
