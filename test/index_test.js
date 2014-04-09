var lookup = require('../');

describe('lookup', function () {
  it('should capture simple module declaration', function () {
    var source = 'angular.module("test", []);';
    lookup(source)
      .should.eql([{uses: []}, {name: 'test', uses: []}]);
  });

  it('should capture the module dependencies', function () {
    var source = 'angular.module("test", ["one"]);';
    lookup(source)
      .should.eql([{uses: ['one']}, {name: 'test', uses: ['one']}]);
  });

  it('should cature module dependencies at root level', function () {
    var source = 'angular.module("test");\nangular.module("another").controller("Ctrl", ["$scope", function ($scope) {}]);';
    lookup(source)
      .should.eql([{uses: ['test', 'another']}]);
    });

  it('should capture multiple module declarations', function () {
    var source = 'angular.module("test", []);\nangular.module("another", ["that"]);';
    lookup(source)
      .should.eql([{uses: ['that']}, {name: 'test', uses: []}, {name: 'another', uses: ['that']}]);
  });

  it('should capture only one copy of duplicated module declaration', function () {
    var source = 'angular.module("test", ["one"]);\nangular.module("test", ["another"]);';
    lookup(source)
      .should.eql([{uses: ['another']}, {name: 'test', uses: ['another']}]);
  });
});
