import Component from '@ember/component';
import layout from '../templates/components/x-test-wrapper-internal';
import { computed } from '@ember/object';

export default Component.extend({
  layout,
  doubleValue: computed('value', function () {
    return (this.value || 0) * 2;
  }),
});
