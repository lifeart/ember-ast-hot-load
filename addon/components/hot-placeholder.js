import Component from '@ember/component';
import layout from '../templates/components/hot-placeholder';

export default Component.extend({
  tagName: '',
  layout,
  // Support ember-test-selectors https://github.com/simplabs/ember-test-selectors#usage-with-tagless-components
  supportsDataTestProperties: true,
});
