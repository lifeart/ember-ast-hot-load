import Component from '@ember/component';
import layout from '../templates/components/dynamic-component-t';

export default Component.extend({
  layout,
  ['foo-bar']: 12,
});
