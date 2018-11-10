import Service from "@ember/service";
import Evented from "@ember/object/evented";
import { getOwner } from "@ember/application";
import { computed } from "@ember/object";
import {
  clearRequirejsCache,
  clearContainerCache
} from "ember-ast-hot-load/utils/cleaners";
const COMPONENT_NAMES_CACHE = {};
const DYNAMIC_HELPERS_WRAPPERS_COMPONENTS = {};
var willHotReloadCallbacks = [];
var willLiveReloadCallbacks = [];
export default Service.extend(Evented, {
  templateOptionsKey: null,
  templateCompilerKey: null,
  triggerInRunLoop(name, attrs) {
    if (name === "willHotReload") {
      willHotReloadCallbacks.forEach(cb => cb(attrs));
    } else if (name === "willLiveReload") {
      willLiveReloadCallbacks.forEach(cb => cb(attrs));
    }
  },
  registerWillHotReload(fn) {
    willHotReloadCallbacks.push(fn);
  },
  registerWillLiveReload(fn) {
    willLiveReloadCallbacks.push(fn);
  },
  unregisterWillHotReload(fn) {
    willHotReloadCallbacks = willLiveReloadCallbacks.filter(f => f !== fn);
  },
  unregisterWillLiveReload(fn) {
    willLiveReloadCallbacks = willLiveReloadCallbacks.filter(f => f !== fn);
  },
  forgetComponent(name) {
    clearContainerCache(this, name);
  },
  clearRequirejs(name) {
    clearRequirejsCache(this, name);
  },
  addDynamicHelperWrapperComponent(name) {
    DYNAMIC_HELPERS_WRAPPERS_COMPONENTS[name] = true;
  },
  hasDynamicHelperWrapperComponent(name) {
    return name in DYNAMIC_HELPERS_WRAPPERS_COMPONENTS;
  },
  isComponent(name) {
    if (!(name in COMPONENT_NAMES_CACHE)) {
      COMPONENT_NAMES_CACHE[name] = this._isComponent(name);
    }
    return COMPONENT_NAMES_CACHE[name];
  },
  isFastboot: computed(function() {
    const fastboot = getOwner(this).lookup("service:fastboot");
    if (!fastboot) {
      return false;
    }
    return fastboot.isFastboot;
  }),
  _isComponent(name) {
    const owner = getOwner(this);
    if (!owner.application.hasRegistration("helper:" + name)) {
      return true;
    }
    const lookup = owner.lookup("component-lookup:main");
    try {
      if (!lookup.componentFor) {
        return !!lookup.lookupFactory(name);
      }

      return !!(
        lookup.componentFor(name, owner) || lookup.layoutFor(name, owner)
      );
    } catch (err) {
      return false;
    }
  }
});
