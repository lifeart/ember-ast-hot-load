import Helper from "@ember/component/helper";
import { inject as service } from "@ember/service";
import { later } from "@ember/runloop";
export default Helper.extend({
  // reloader: injectService(),
  hotLoader: service(),

  init() {
    this._super(...arguments);

    this.hotLoader.on("reload", this, "recompute");
    this.hotLoader.on("willHotReload", this, "__rerenderOnTemplateUpdate");
    this.hotLoader.on("willLiveReload", this, "__willLiveReload");
    //   this.reloader.onReload(() => this.recompute());
  },
  __rerenderOnTemplateUpdate() {
	this.hotLoader.forgetComponent(this.firstComputeName);
	later(()=>{
		this.recompute();
	});
    // firstComputeName
    console.log("__rerenderOnTemplateUpdate", this.firstComputeName);
  },
  __willLiveReload(event) {
	console.log("__willLiveReload");
	// debugger;
    // debugger;
	// const baseComponentName = this.get("baseComponentName");
	console.log('event.modulePath', event.modulePath);
	if (event.modulePath.includes('test-')) {
		event.cancel = true;
		this.hotLoader.clearRequirejs(this.firstComputeName);
	}
    // if (matchingComponent(this.firstComputeName, event.modulePath)) {
    //   event.cancel = true;
    //   clearRequirejs(this, this.firstComputeName);
    // }
  },
  willDestroy() {
    this._super(...arguments);
    this.hotLoader.off("reload", this, "recompute");
  },
  compute([name]) {
    //   debugger;
    console.log("compute", name);
    // let revision = this.reloader.revisionFor(name);
    if (name === this.firstCompute) {
      this.firstCompute = false;
      later(() => {
        this.recompute();
      });
      return "hot-placeholder";
    }
    if (!this.firstCompute) {
      this.firstCompute = name;
      this.firstComputeName = name;
    }
    // if (revision === undefined) {
    return name;
    // } else {
    //   return `${name}--hot-reload-${revision}`;
    // }
  }
});
