'use strict';

var esprima = require('esprima');
var estraverse = require('estraverse');
var _ = require('lodash');

function parseOptions(opts) {
  var defaultOpts = {
    // default options
  };
  return _.merge(defaultOpts, (opts || {}));
}

function findDependencies(source, opts) {
  opts = parseOptions(opts);

  var potentialModuleNameVariable = {};
  var rootDeps = [];
  var modules = {};

  estraverse.traverse(esprima.parse(source, {sourceType: "module"}), {
    leave: function(node, parent) {
      if (canBeModuleNameVariableDeclaration(node)) {
        potentialModuleNameVariable[node.id.name] = node.init.value;
      }

      if (!isAngularModuleStatement(node)) {
        if (isNgModuleDeclaration(node)) {
          modules['ng'] = [];
        }
        return;
      }

      var moduleNameArg = parent.arguments[0];
      var moduleName = moduleNameArg.value || potentialModuleNameVariable[moduleNameArg.name];
      if (parent.arguments[1]) {
        // if already declared, will reset dependencies, like how angular behaves (latest declaration wins)
        modules[moduleName] = _.map(parent.arguments[1].elements, 'value');
      } else {
        rootDeps.push(moduleName);
      }
    }
  });

  var moduleKeys = _.keys(modules);
  var moduleValues = _.values(modules);

  // aggregates all root + sub depedencies, and remove ones that were declared locally
  rootDeps = _(rootDeps).union(_.flatten(moduleValues)).uniq().value();
  rootDeps = _.difference(rootDeps, moduleKeys);

  var isAngular = moduleKeys.length > 0 || rootDeps.length > 0;
  if (isAngular && !_.has(modules, 'ng') && !_.some(rootDeps, 'ng')) {
    rootDeps.unshift('ng');
  }

  var ret = {
    dependencies: rootDeps,
    modules: modules
  };

  return ret;
}

function isAngularModuleStatement(node) {
  return node.type === 'MemberExpression' && node.object.name === 'angular' && node.property.name === 'module';
}

function isNgModuleDeclaration(node) {
  return node.type === 'CallExpression' && node.callee.name === 'angularModule' && node.arguments.length > 0 && node.arguments[0].value === 'ng';
}

function canBeModuleNameVariableDeclaration(node) {
  return node.type === 'VariableDeclarator' && node.init && typeof node.init.value === 'string';
}

module.exports = findDependencies;
module.exports.isAngularModuleStatement = isAngularModuleStatement;
module.exports.isNgModuleDeclaration = isNgModuleDeclaration;
