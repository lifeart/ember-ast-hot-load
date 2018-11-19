import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Helper | hot-load', function(hooks) {
  setupRenderingTest(hooks);

  // Replace this with your real tests.
  test('it renders', async function(assert) {
    this.set('inputValue', '1234');

    await render(hbs`{{hot-load inputValue}}`);

    assert.equal(this.element.textContent.trim(), 'hot-content');
  });

  test('it handle correct components wrapping', async function(assert) {
    await render(hbs`{{hot-load "hot-placeholder"}}`);
    assert.equal(this.element.textContent.trim(), 'hot-placeholder');
    await render(hbs`{{hot-load "hot-content"}}`);
    assert.equal(this.element.textContent.trim(), 'hot-content');
  });

  test('it handle correct components wrapping name', async function(assert) {
    await render(hbs`{{hot-load "boo-boo"}}`);
    assert.equal(this.element.textContent.trim(), 'helper boo-boo');
    await render(hbs`{{hot-load "foo-bar"}}`);
    assert.equal(this.element.textContent.trim(), 'helper foo-bar');
  });

});
