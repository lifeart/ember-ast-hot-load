import {
  componentNameFromClassName,
  dasherizePath,
  normalizePath,
  dasherizeName,
  normalizeComponentName,
  getPossibleRouteTemplateMeta,
} from 'ember-ast-hot-load/utils/normalizers';
import { module, test } from 'qunit';

module('Unit | Utility | normalizers', function () {
  // Replace this with your real tests.
  test('componentNameFromClassName should return normalized name', function (assert) {
    assert.equal(componentNameFromClassName('FooBar'), 'foo-bar');
    assert.equal(componentNameFromClassName('FooBarClass'), 'foo-bar');
    assert.equal(componentNameFromClassName('FooBarComponent'), 'foo-bar');
    assert.equal(
      componentNameFromClassName('XFooBarClassComponent'),
      'x-foo-bar'
    );
    assert.equal(componentNameFromClassName('FooV2'), 'foo-v2');
  });

  test('dasherizePath should dasherize camelized paths', function (assert) {
    assert.equal(dasherizePath('FooBar/BooBaz'), 'foo-bar/boo-baz');
  });

  test('normalizePath should convert windows paths and camelized names', function (assert) {
    assert.equal(normalizePath('FooBar\\BooBaz'), 'foo-bar/boo-baz');
  });

  test('dasherizeName should convert component names to valid form', function (assert) {
    assert.equal(dasherizeName('XFooBar'), 'x-foo-bar');
    assert.equal(dasherizeName('XFooBar/BooBaz'), 'x-foo-bar/boo-baz');
    assert.equal(dasherizeName('FooBar/BooBaz'), 'foo-bar/boo-baz');
    assert.equal(dasherizeName('Foo/Boo'), 'foo/boo');
  });

  test('normalizeComponentName should convert component name to valid lowercased form', function (assert) {
    assert.equal(normalizeComponentName('XFooBar'), 'x-foo-bar');
    assert.equal(normalizeComponentName('XFooBar/BooBaz'), 'x-foo-bar/boo-baz');
    assert.equal(normalizeComponentName('FooBar/BooBaz'), 'foo-bar/boo-baz');
    assert.equal(normalizeComponentName('Foo/Boo'), 'foo/boo');
    assert.equal(normalizeComponentName('foo-boo'), 'foo-boo');
    assert.equal(normalizeComponentName('foo--boo'), 'foo--boo');
    assert.equal(
      normalizeComponentName('foo--boo/doo-doo'),
      'foo--boo/doo-doo'
    );
    assert.equal(normalizeComponentName('fooboo'), 'fooboo');
    assert.deepEqual(normalizeComponentName({ name: 1 }), { name: 1 });
  });

  test('getPossibleRouteTemplateMeta should return some meta from template path', function (assert) {
    assert.deepEqual(
      getPossibleRouteTemplateMeta('/src/ui/route/foo/boo/template.hbs'),
      {
        isMU: true,
        looksLikeRouteTemplate: false,
        maybeClassicPath: false,
        maybePodsPath: true,
        possibleRouteName: '.route.foo.boo.template',
        possibleTemplateName: '/route/foo/boo/template',
      }
    );

    assert.deepEqual(
      getPossibleRouteTemplateMeta('/app/pods/foo-bar/template.hbs'),
      {
        isMU: false,
        looksLikeRouteTemplate: true,
        maybeClassicPath: false,
        maybePodsPath: true,
        possibleRouteName: 'pods.foo-bar.template',
        possibleTemplateName: 'pods/foo-bar/template',
      }
    );

    assert.deepEqual(
      getPossibleRouteTemplateMeta('/app/templates/foo-bar/template.hbs'),
      {
        isMU: false,
        looksLikeRouteTemplate: true,
        maybeClassicPath: true,
        maybePodsPath: true,
        possibleRouteName: 'foo-bar.template',
        possibleTemplateName: 'foo-bar/template',
      }
    );
  });
});
