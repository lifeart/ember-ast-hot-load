import Helper from "@ember/component/helper";
import { inject as service } from "@ember/service";
import { later, cancel } from "@ember/runloop";

function matchingComponent(componentName, path) {
  let normalizedPath = path.split("\\").join("/");
  let possibleExtensions = [
		".ts", 
		".js", 
		".hbs",
		"/component.ts",
		"/component.js",
		"/template.hbs",
	];
  let possibleEndings = possibleExtensions.map(ext => componentName + ext);
  let result =  possibleEndings.filter(name => {
    return normalizedPath.endsWith(name);
	}).length;
	
	return result;
}


export default Helper.extend({
  hotLoader: service(),

  init() {
    this._super(...arguments);
    this.hotLoader.on("willHotReload", this, "__rerenderOnTemplateUpdate");
    this.hotLoader.on("willLiveReload", this, "__willLiveReload");
  },
  __rerenderOnTemplateUpdate(path) {
    if (matchingComponent(this.firstComputeName, path)) {
      this.hotLoader.forgetComponent(this.firstComputeName);
      cancel(this.timer);
      this.timer = later(() => {
        this.recompute();
      });
    }
  },
  __willLiveReload(event) {
    if (matchingComponent(this.firstComputeName, event.modulePath)) {
      event.cancel = true;
      this.hotLoader.clearRequirejs(this.firstComputeName);
    }
  },
  willDestroy() {
    this._super(...arguments);
    cancel(this.timer);
    this.hotLoader.off("willHotReload", this, "__rerenderOnTemplateUpdate");
    this.hotLoader.off("willLiveReload", this, "__willLiveReload");
  },
  compute([name]) {
    if (name === this.firstCompute) {
      this.firstCompute = false;
      this.timer = later(() => {
        this.recompute();
      });
      return "hot-placeholder";
    }
    if (!this.firstCompute) {
      this.firstCompute = name;
      this.firstComputeName = name;
    }

    if (this.firstComputeName !== name) {
      this.firstComputeName = name;
    }

    return name;
  }
});
