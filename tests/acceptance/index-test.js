import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | index', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /index', async function(assert) {
    await visit('/');
    const hotLoaderService = this.owner.lookup('service:hot-loader');
    assert.equal(hotLoaderService._willHotReloadCallbacksCount(), hotLoaderService._willLiveReloadCallbacksCount());
    assert.equal(hotLoaderService._willLiveReloadCallbacksCount(), 36);
    assert.equal(currentURL(), '/');
  });
});
