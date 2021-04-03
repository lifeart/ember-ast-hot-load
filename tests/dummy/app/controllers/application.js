import Controller from '@ember/controller';
import { computed } from '@ember/object';
export default Controller.extend({
  items: computed(function () {
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }),
});
