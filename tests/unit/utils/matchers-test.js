import {
  hasValidHelperName,
  isValidComponentExtension,
  matchingComponent,
  looksLikeRouteTemplate,
} from 'ember-ast-hot-load/utils/matchers';
import { module, test } from 'qunit';

module('Unit | Utility | matchers', function () {
  // Replace this with your real tests.
  test('hasValidHelperName should do basic naming validation', function (assert) {
    assert.equal(hasValidHelperName('foo'), true);
    assert.equal(hasValidHelperName('Foo'), true);
    assert.equal(hasValidHelperName('FooBar'), true);
    assert.equal(hasValidHelperName('foo-bar'), true);
    assert.equal(hasValidHelperName('@foo'), false);
    assert.equal(hasValidHelperName('@Foo'), false);
    assert.equal(hasValidHelperName('f.oo'), false);
    assert.equal(hasValidHelperName('attrs.foo'), false);
    assert.equal(hasValidHelperName('foo/bar'), false);
    assert.equal(hasValidHelperName('foo/'), false);
    assert.equal(hasValidHelperName('Foo/Bar'), false);
  });

  test('isValidComponentExtension should return true only for .js/.hbs/.ts files', function (assert) {
    assert.equal(isValidComponentExtension('.ts'), true);
    assert.equal(isValidComponentExtension('.js'), true);
    assert.equal(isValidComponentExtension('.hbs'), true);
    assert.equal(isValidComponentExtension('foo-bar/item.hbs'), true);
    assert.equal(isValidComponentExtension('foo-bar/item.js'), true);
    assert.equal(isValidComponentExtension('foo-bar/item.ts'), true);

    assert.equal(isValidComponentExtension('.css'), false);
    assert.equal(isValidComponentExtension('.less'), false);
    assert.equal(isValidComponentExtension('.jsx'), false);
    assert.equal(isValidComponentExtension('.html'), false);
    assert.equal(isValidComponentExtension('foo/bar.jsx'), false);
    assert.equal(isValidComponentExtension('foo.scss'), false);
    assert.equal(isValidComponentExtension('Foo/Bar'), false);
  });

  test('matchingComponent should match component name to normalized file path', function (assert) {
    function validLocations(name) {
      const locations = [
        `components/${name}.js`,
        `components/${name}.hbs`,
        `components/${name}.ts`,
        `components/${name}/component.js`,
        `components/${name}/template.hbs`,
        `templates/components/${name}.hbs`,
        `components/${name}/component.ts`,
        `ui/components/${name}/template.hbs`,
        `ui/components/${name}/component.js`,
        `ui/components/${name}/component.ts`,
        `ui/routes/route-${name}/-components/${name}/template.hbs`,
        `ui/routes/route-${name}/-components/${name}/component.js`,
        `ui/routes/route-${name}/-components/${name}/component.ts`,
        `ui/routes/route-${name}/${name}/${name}/template.hbs`,
        `ui/routes/route-${name}/${name}/${name}/component.js`,
        `ui/routes/route-${name}/${name}/${name}/component.ts`,
      ];
      return [].concat(
        locations,
        locations.map((location) => location.toString().replace(/\//gi, '\\'))
      );
    }

    validLocations('foo').forEach((path) => {
      assert.equal(
        matchingComponent('foo', path),
        true,
        `foo should match ${path}`
      );
      assert.equal(
        matchingComponent('food', path),
        false,
        `food should not match ${path}`
      );
    });
    validLocations('foo/bar').forEach((path) => {
      assert.equal(
        matchingComponent('foo/bar', path),
        true,
        `foo/bar should match ${path}`
      );
      assert.equal(
        matchingComponent('food/bar', path),
        false,
        `food/bar should not match ${path}`
      );
    });
    validLocations('foo-bar').forEach((path) => {
      assert.equal(
        matchingComponent('foo-bar', path),
        true,
        `foo-bar should match ${path}`
      );
      assert.equal(
        matchingComponent('FooBar', path),
        true,
        `FooBar should match ${path}`
      );
      assert.equal(
        matchingComponent('FooBars', path),
        false,
        `FooBars should not match ${path}`
      );
    });
    validLocations('x-name-bar').forEach((path) => {
      assert.equal(
        matchingComponent('x-name-bar', path),
        true,
        `x-name-bar should match ${path}`
      );
      assert.equal(
        matchingComponent('X-NameBar', path),
        true,
        `XNameBar should match ${path}`
      );
      assert.equal(
        matchingComponent('NameBar', path),
        false,
        `NameBar should not match ${path}`
      );
    });
  });

  test('looksLikeRouteTemplate should return true for classic, pods and mu structure', function (assert) {
    function validLocations(name) {
      const locations = [
        `ui/routes/${name}/template.hbs`,
        `app/pods/route-${name}/template.hbs`,
        `app/routes/${name}/template.hbs`,
        `app/templates/${name}.hbs`,
      ];
      return [].concat(
        locations,
        locations.map((location) => location.toString().replace(/\//gi, '\\'))
      );
    }
    function invalidLocations(name) {
      const locations = [
        `ui/routes/${name}/-components/foo/template.hbs`,
        `app/pods/components/${name}/template.hbs`,
        `app/pods/route-${name}/${name}/template.hbs`,
        `app/routes/${name}/template.js`,
        `app/templates/components/${name}.hbs`,
      ];
      return [].concat(
        locations,
        locations.map((location) => location.toString().replace(/\//gi, '\\'))
      );
    }
    validLocations('foo-bar').forEach((location) => {
      assert.equal(
        looksLikeRouteTemplate(location),
        true,
        `location ${location} should look like route template`
      );
    });
    invalidLocations('foo-bar').forEach((location) => {
      assert.equal(
        looksLikeRouteTemplate(location),
        false,
        `location ${location} should not look like route template`
      );
    });
  });

  test('looksLikeRouteTemplate should return true for classic, pods and mu structure with custom pods location', function (assert) {
    function validLocations(name) {
      const locations = [`app/foo-pods/pods/route-${name}/template.hbs`];
      return [].concat(
        locations,
        locations.map((location) => location.toString().replace(/\//gi, '\\'))
      );
    }
    function invalidLocations(name) {
      const locations = [
        `app/foo-pods/pods/components/${name}/template.hbs`,
        `app/foo-pods/pods/route-${name}/${name}/template.hbs`,
      ];
      return [].concat(
        locations,
        locations.map((location) => location.toString().replace(/\//gi, '\\'))
      );
    }
    validLocations('foo-bar').forEach((location) => {
      assert.equal(
        looksLikeRouteTemplate(location, 'foo-pods/pods'),
        true,
        `location ${location} should look like route template`
      );
    });
    invalidLocations('foo-bar').forEach((location) => {
      assert.equal(
        looksLikeRouteTemplate(location, 'foo-pods/pods'),
        false,
        `location ${location} should not look like route template`
      );
    });
  });
});
