import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
export default Controller.extend({
	hotLoader: service(),
	items: computed(function(){
		return [1,2,3,4,5,6,7,8];
	})
});
