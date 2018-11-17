import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | hot-loader', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let service = this.owner.lookup('service:hot-loader');
    assert.ok(service);
  });

  test('service options must exists', function(assert) {
    const service  = this.owner.lookup('service:hot-loader');
    assert.ok(service.templateOptionsKey !== undefined);
    assert.ok(service.templateCompilerKey !== undefined);
    assert.equal(typeof service.useOriginalVendorFile, 'boolean');
    assert.equal(typeof service.scriptDownloadErrors, 'number');
  });

  test('isMatchingComponent should match some cases', function(assert) {
    const service  = this.owner.lookup('service:hot-loader');
    const match = (name, path) => {
      return service.isMatchingComponent(name, path);
    }
    const extensions = ['ts','js','hbs'];
    extensions.forEach((ext)=>{
      assert.equal(match('foo',`foo.${ext}`), true, `should match .${ext} files`);
      if (ext === 'hbs') {
        assert.equal(match('foo',`foo/template.${ext}`), true, `should understand pods-like style for .${ext} files`);
      } else {
        assert.equal(match('foo',`foo/component.${ext}`), true, `should understand pods-like style for .${ext} files`);
      }
    });
    assert.equal(match('foo','foo'), false, 'should skip matching for unknown extensions');
    assert.equal(match('-some/prefixed/component','components/-some/prefixed/component/template.hbs'), true, 'shoul handle slashed templates');
    assert.equal(match('-some/prefixed/component','components\\-some\\prefixed\\component\\template.hbs'), true, 'shoul handle slashed templates for windows paths');
    
    assert.equal(match('component-name','components/ComponentName.js'), true, 'shoul handle camelCased paths');
    assert.equal(match('ComponentName','components/ComponentName.js'), true, 'shoul handle camelCased components and paths');
    assert.equal(match('ComponentName','components/component-name.js'), true, 'shoul handle camelCased components and normal paths');
  });

  test('triggers must be callable', function(assert) {
    const service  = this.owner.lookup('service:hot-loader');
    let triggerForWillHotReloadCalled = false;
    let triggerForWillLiveReloadCalled = false;
    const willHotReloadCallback = () => { triggerForWillHotReloadCalled = true };
    const willLiveReloadCallback = () => { triggerForWillLiveReloadCalled = true };
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
    assert.equal(triggerForWillHotReloadCalled, true, 'triggerForWillHotReloadCalled should be true');
    assert.equal(triggerForWillLiveReloadCalled, true, 'triggerForWillLiveReloadCalled should be true');
    triggerForWillHotReloadCalled = false;
    triggerForWillLiveReloadCalled = false;
    service.unregisterWillHotReload(willHotReloadCallback);
    service.unregisterWillLiveReload(willLiveReloadCallback);
    service.triggerInRunLoop('willHotReload', {});
    service.triggerInRunLoop('willLiveReload', {})
    assert.equal(triggerForWillHotReloadCalled, false, 'triggerForWillHotReloadCalled should be false');
    assert.equal(triggerForWillLiveReloadCalled, false, 'triggerForWillLiveReloadCalled should be false');
  });
});
