import Component from '@ember/component';
import layout from '../templates/components/hot-content';
import { reads } from '@ember/object/computed';

export default Component.extend({
  layout,
  value: reads('hotReloadCUSTOMhlProperty'),
  tagName: '',
  // Support ember-test-selectors https://github.com/simplabs/ember-test-selectors#usage-with-tagless-components
  supportsDataTestProperties: true,
});
