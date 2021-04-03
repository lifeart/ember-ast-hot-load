import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

function xTestWrapperAssets(el, assert) {
  assert.equal(el.querySelectorAll('.t-cover').length, 1);
  assert.equal(el.querySelector('.t-cover').textContent.trim(), 12);
  assert.equal(el.querySelectorAll('.double-value').length, 2);
  assert.equal(el.querySelector('.double-value').textContent.trim(), '84');
  assert.equal(el.querySelectorAll('.value').length, 2);
  assert.equal(el.querySelector('.value').textContent.trim(), '42');
}

module('Integration | Component | hot-content', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`{{hot-content hotReloadCUSTOMhlProperty=42}}`);

    assert.equal(this.element.textContent.trim(), '42');
  });

  test('it handle both input components invocation', async function (assert) {
    await render(hbs`{{input-wrapper}}`);
    assert.ok(this.element.querySelector('input[name="foo"]'));
    assert.ok(this.element.querySelector('textarea[name="boo-boo"]'));
  });

  test('it handle helpers with positional and hashy params', async function (assert) {
    await render(hbs`{{complex-helper-wrapper}}`);
    const expextedResult = `{"params":[1,"1",{"a":"a"}],"hash":{"foo":"bar","boo":{"doo":"foo"}}}`.toString();
    assert.equal(this.element.textContent, expextedResult);
  });

  test('it handle contextual names looking like components, but with dot - ctx.foo-bar', async function (assert) {
    const el = this.element;
    await render(hbs`{{bs-nested-wrapper}}`);
    xTestWrapperAssets(el, assert);
  });

  test('in can hande angle-bracked invocation components with one camel name', async function (assert) {
    const el = this.element;
    await render(hbs`{{angle-br-single}}`);
    xTestWrapperAssets(el, assert);
  });

  test('in can hande angle-bracked invocation components with more then one camel name', async function (assert) {
    const el = this.element;
    await render(hbs`{{angle-br}}`);
    xTestWrapperAssets(el, assert);
  });

  test('in can hande angle-bracked invocation components with more then one camel name, created by let syntaxis', async function (assert) {
    const el = this.element;
    await render(hbs`{{leted-angle-br}}`);
    xTestWrapperAssets(el, assert);
  });

  test('in can hande angle-bracked invocation components with one camel name, created by let syntaxis', async function (assert) {
    const el = this.element;
    await render(hbs`{{leted-angle-br-single}}`);
    xTestWrapperAssets(el, assert);
  });

  test('in can hande componenents, passed as @arguments', async function (assert) {
    const el = this.element;
    await render(hbs`{{arg-wrapper itemComponentName="x-test-wrapper"}}`);
    xTestWrapperAssets(el, assert);
  });

  test('it can handle components, with name, resolved by unknown context', async function (assert) {
    const el = this.element;
    await render(hbs`{{unknown-context-wrapper}}`);
    xTestWrapperAssets(el, assert);
  });

  test('it can handle components, with name, resolved from context', async function (assert) {
    const el = this.element;
    await render(hbs`{{context-wrapper}}`);
    xTestWrapperAssets(el, assert);
  });

  test('it can hande componenents, passed as strings to component helper', async function (assert) {
    const el = this.element;
    await render(hbs`{{name-wrapper}}`);
    xTestWrapperAssets(el, assert);
  });

  test('it can handle component attributes', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });
    const el = this.element;
    await render(hbs`{{x-test-wrapper}}`);
    xTestWrapperAssets(el, assert);
  });

  test('it can handle passed attributes', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });
    const el = this.element;
    this.set('value', 50);
    await render(hbs`{{x-test-wrapper-internal value=value}}`);
    assert.equal(el.querySelectorAll('.double-value').length, 1);
    assert.equal(el.querySelector('.double-value').textContent.trim(), '100');
    assert.equal(el.querySelectorAll('.value').length, 1);
    assert.equal(el.querySelector('.value').textContent.trim(), '50');
  });
});
