import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | hot-loader', function (hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    let service = this.owner.lookup('service:hot-loader');
    assert.ok(service);
  });

  test('service options must exists', function (assert) {
    const service = this.owner.lookup('service:hot-loader');
    assert.ok(service.get('templateOptionsKey') !== undefined);
    assert.ok(service.get('templateCompilerKey') !== undefined);
    assert.equal(typeof service.get('useOriginalVendorFile'), 'boolean');
    assert.equal(typeof service.get('scriptDownloadErrors'), 'number');
  });

  test('isMatchingComponent should match some cases', function (assert) {
    const service = this.owner.lookup('service:hot-loader');
    const match = (name, path) => {
      return service.isMatchingComponent(name, path);
    };
    const extensions = ['ts', 'js', 'hbs'];
    extensions.forEach((ext) => {
      assert.equal(
        match('foo', `/foo.${ext}`),
        true,
        `should match .${ext} files`
      );
      if (ext === 'hbs') {
        assert.equal(
          match('foo', `/foo/template.${ext}`),
          true,
          `should understand pods-like style for .${ext} files`
        );
      } else {
        assert.equal(
          match('foo', `/foo/component.${ext}`),
          true,
          `should understand pods-like style for .${ext} files`
        );
      }
    });
    assert.equal(
      match('foo', 'foo'),
      false,
      'should skip matching for unknown extensions'
    );
    assert.equal(
      match(
        '-some/prefixed/component',
        'components/-some/prefixed/component/template.hbs'
      ),
      true,
      'shoul handle slashed templates'
    );
    assert.equal(
      match(
        '-some/prefixed/component',
        'components\\-some\\prefixed\\component\\template.hbs'
      ),
      true,
      'shoul handle slashed templates for windows paths'
    );

    assert.equal(
      match('component-name', 'components/ComponentName.js'),
      true,
      'shoul handle camelCased paths'
    );
    assert.equal(
      match('ComponentName', 'components/ComponentName.js'),
      true,
      'shoul handle camelCased components and paths'
    );
    assert.equal(
      match('ComponentName', 'components/component-name.js'),
      true,
      'shoul handle camelCased components and normal paths'
    );
    assert.equal(
      match('query-builder', 'app\\controllers\\protected\\query-builder.ts'),
      false,
      'should skip controllers path'
    );
    assert.equal(
      match('query-builder', 'app\\helpers\\protected\\query-builder.ts'),
      false,
      'should skip helpers path'
    );
    assert.equal(
      match('query-builder', 'app\\services\\protected\\query-builder.ts'),
      false,
      'should skip services path'
    );
    assert.equal(
      match('query-builder', 'app\\utils\\protected\\query-builder.ts'),
      false,
      'should skip utils path'
    );
    assert.equal(
      match('query-builder', 'app\\adapters\\protected\\query-builder.ts'),
      false,
      'should skip adapters path'
    );
    assert.equal(
      match('query-builder', 'app\\models\\protected\\query-builder.ts'),
      false,
      'should skip models path'
    );
    assert.equal(
      match('query-builder', 'app\\routes\\protected\\query-builder.ts'),
      false,
      'should skip routes path'
    );
  });

  test('triggers must be callable', function (assert) {
    const service = this.owner.lookup('service:hot-loader');
    let triggerForWillHotReloadCalled = false;
    let triggerForWillLiveReloadCalled = false;
    const willHotReloadCallback = () => {
      triggerForWillHotReloadCalled = true;
    };
    const willLiveReloadCallback = () => {
      triggerForWillLiveReloadCalled = true;
    };
    service.triggerInRunLoop('willHotReload', {});
    assert.equal(triggerForWillHotReloadCalled, false);
    assert.equal(triggerForWillLiveReloadCalled, false);
    service.triggerInRunLoop('willLiveReload', {});
    assert.equal(triggerForWillHotReloadCalled, false);
    assert.equal(triggerForWillLiveReloadCalled, false);
    service.registerWillHotReload(willHotReloadCallback);
    service.registerWillLiveReload(willLiveReloadCallback);
    service.triggerInRunLoop('willHotReload', {});
    service.triggerInRunLoop('willLiveReload', {});
    assert.equal(
      triggerForWillHotReloadCalled,
      true,
      'triggerForWillHotReloadCalled should be true'
    );
    assert.equal(
      triggerForWillLiveReloadCalled,
      true,
      'triggerForWillLiveReloadCalled should be true'
    );
    triggerForWillHotReloadCalled = false;
    triggerForWillLiveReloadCalled = false;
    service.unregisterWillHotReload(willHotReloadCallback);
    service.unregisterWillLiveReload(willLiveReloadCallback);
    service.triggerInRunLoop('willHotReload', {});
    service.triggerInRunLoop('willLiveReload', {});
    assert.equal(
      triggerForWillHotReloadCalled,
      false,
      'triggerForWillHotReloadCalled should be false'
    );
    assert.equal(
      triggerForWillLiveReloadCalled,
      false,
      'triggerForWillLiveReloadCalled should be false'
    );
  });

  test('isHelper method should return true or false, depends on helper registration', function (assert) {
    const service = this.owner.lookup('service:hot-loader');
    assert.equal(
      service.isHelper('hot-load'),
      true,
      'hot-load helper must be resolved'
    );
    assert.equal(
      service.isHelper('cold-load'),
      false,
      'cold-load helper must be unresolved'
    );
  });

  test('_isComponent method must resturn true or false', function (assert) {
    const service = this.owner.lookup('service:hot-loader');
    assert.equal(
      service._isComponent('hot-content'),
      true,
      'hot-content component name should be resolvable'
    );
    assert.equal(
      service._isComponent('cold-content'),
      false,
      'cold-content component name should be non-resolvable'
    );
    assert.equal(
      service._isComponent('template-only-component'),
      true,
      'template-only-component`s should be resolvable'
    );
    assert.equal(
      service._isComponent('hot-load'),
      false,
      'helper names should be non-resolvable'
    );
  });

  test('isFastBoot property must return false without fastboot', function (assert) {
    const service = this.owner.lookup('service:hot-loader');
    assert.equal(
      service.get('isFastBoot'),
      false,
      'isFastBoot must equal false if no fastboot'
    );
  });

  test('shold cache dynamic components registration', function (assert) {
    const service = this.owner.lookup('service:hot-loader');
    assert.equal(
      service.hasDynamicHelperWrapperComponent('foo'),
      false,
      'if no registered component method must return false'
    );
    assert.equal(service.addDynamicHelperWrapperComponent('foo'));
    assert.equal(
      service.hasDynamicHelperWrapperComponent('foo'),
      true,
      'if registered component method must return true'
    );
  });
});
