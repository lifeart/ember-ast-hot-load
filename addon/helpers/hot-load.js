import Helper from "@ember/component/helper";
import { inject as service } from "@ember/service";
import { later, cancel } from "@ember/runloop";
import { get } from "@ember/object";

export default Helper.extend({
  hotLoader: service(),
  init() {
    this._super(...arguments);
    this.binded__rerenderOnTemplateUpdate = this.__rerenderOnTemplateUpdate.bind(
      this
    );
    const hotLoader = get(this, 'hotLoader');
    this.binded__willLiveReload = this.__willLiveReload.bind(this);
    hotLoader.registerWillHotReload(this.binded__rerenderOnTemplateUpdate);
    hotLoader.registerWillLiveReload(this.binded__willLiveReload);
  },
  __rerenderOnTemplateUpdate(path) {
    const hotLoader = get(this, 'hotLoader');
    if (hotLoader.isMatchingComponent(this.firstComputeName, path)) {
      hotLoader.forgetComponent(this.firstComputeName);
      cancel(this.timer);
      this.timer = later(() => {
        this.recompute();
      });
    }
  },
  __willLiveReload(event) {
    const hotLoader = get(this, 'hotLoader');
    if (hotLoader.isMatchingComponent(this.firstComputeName, event.modulePath)) {
      event.cancel = true;
      (this.possibleNames || []).forEach((computedName)=>{
        if (!event.components.includes(computedName)) {
          event.components.push(computedName);
        }
        hotLoader.clearRequirejs(computedName);
      });
    }
  },
  willDestroy() {
    this._super(...arguments);
    cancel(this.timer);
    const hotLoader = get(this, 'hotLoader');
    hotLoader.unregisterWillHotReload(
      this.binded__rerenderOnTemplateUpdate
    );
    hotLoader.unregisterWillLiveReload(this.binded__willLiveReload);
  },
  compute([name, context = {}, maybePropertyValue = undefined, astStringName = '']) {
    const hotLoader = get(this, 'hotLoader');
    const safeAstName = String(astStringName || '');
    this.possibleNames = [ name ].concat(hotLoader.scopedComponentNames(name, context));
    // console.log('compute', {
    //   name, context, maybePropertyValue, astStringName,
    //   isComponent: hotLoader.isComponent(name, context),
    //   isHelper: hotLoader.isHelper(name)
    // });
    const isArgument = safeAstName.charAt(0) === '@' || safeAstName.startsWith('attrs.');
		if (!isArgument && ((name in context) || (typeof maybePropertyValue !== 'undefined'))) {
      if (!(name in context) && !hotLoader.isComponent(name, context) && !hotLoader.isHelper(name)) {
        // if it's not component, not in scope and not helper - dunno, we need to render placeholder with value;
        return hotLoader.renderDynamicComponentHelper(name, context, maybePropertyValue);
      }
    }
    if (!hotLoader.isComponent(name, context)) {
      if (hotLoader.isHelper(name)) {
        hotLoader.registerDynamicComponent(name);
        return hotLoader.dynamicComponentNameForHelperWrapper(name);
      } else {
        return hotLoader.renderDynamicComponentHelper(name, context, maybePropertyValue);
      }    
    }
    if (name === this.firstCompute) {
      this.firstCompute = false;
      this.timer = later(() => {
        this.recompute();
      });
      return hotLoader.placeholderComponentName();
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
