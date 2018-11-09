import Service from "@ember/service";
import Evented from "@ember/object/evented";
import { getOwner } from "@ember/application";
import { clearRequirejsCache, clearContainerCache } from "ember-ast-hot-load/utils/cleaners";

const COMPONENT_NAMES_CACHE = {};
const DYNAMIC_HELPERS_WRAPPERS_COMPONENTS = {};

export default Service.extend(Evented, {
  templateOptionsKey: null,
  templateCompilerKey: null,
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
  _isComponent(name) {
	const owner = getOwner(this);
    const lookup = owner.lookup('component-lookup:main');

    try {
      if (!lookup.componentFor) {
        return !!lookup.lookupFactory(name);
      }

      return !!(lookup.componentFor(name, owner) || lookup.layoutFor(name, owner));
    } catch(err) {
      return false;
    }
  }
});
