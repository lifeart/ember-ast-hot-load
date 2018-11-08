import Service from "@ember/service";
import Evented from "@ember/object/evented";
import { clearRequirejsCache, clearContainerCache } from "ember-ast-hot-load/utils/cleaners";

export default Service.extend(Evented, {
  templateOptionsKey: null,
  templateCompilerKey: null,
  forgetComponent(name) {
    clearContainerCache(this, name);
  },
  clearRequirejs(name) {
    clearRequirejsCache(this, name);
  }
});
