import Helper from "@ember/component/helper";
import { inject as service } from "@ember/service";
import { later } from '@ember/runloop';
export default  Helper.extend({
  // reloader: injectService(),
  hotLoader: service(),

  init() {
	this._super(...arguments);
	console.log('init');
	this.hotLoader.on('reload', this, 'recompute');
    //   this.reloader.onReload(() => this.recompute());
  },
  willDestroy() {
	this._super(...arguments);
	console.log('willDestroy');
	this.hotLoader.off('reload', this, 'recompute');
  },
  compute([name]) {
	//   debugger;
	console.log('compute', name);
	// let revision = this.reloader.revisionFor(name);
	if (name === this.firstCompute) {
		this.firstCompute = false;
		later(()=>{
			this.recompute();
		});
		return 'hot-placeholder';
	}
	if (!this.firstCompute) {
		this.firstCompute = name;
	}
    // if (revision === undefined) {
      return name;
    // } else {
    //   return `${name}--hot-reload-${revision}`;
    // }
  }
});