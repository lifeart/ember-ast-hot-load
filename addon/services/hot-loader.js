import Service from "@ember/service";
import Evented from "@ember/object/evented";
import { getOwner } from "@ember/application";

var templateOptionsKey = null;
var templateCompilerKey = null;

function clearIfHasProperty(obj, propertyName) {
  if (obj && Object.hasOwnProperty.call(obj, propertyName)) {
    obj[propertyName] = undefined;
  }
}

function clear(owner, name) {
  if (templateCompilerKey) {
    // Ember v3.2
    var templateCompiler = owner.lookup(templateCompilerKey);
    var compileTimeLookup = templateCompiler.resolver;
    var compileRuntimeResolver = compileTimeLookup.resolver;
    compileRuntimeResolver.componentDefinitionCache.clear();
  } else if (templateOptionsKey) {
    // Ember v3.1.1
    var templateOptions = owner.lookup(templateOptionsKey);
    var optionsTimeLookup = templateOptions.resolver;
    var optionsRuntimeResolver = optionsTimeLookup.resolver;
    optionsRuntimeResolver.componentDefinitionCache.clear();
  } else {
    var environment = owner.lookup("service:-glimmer-environment");
    if (environment) {
      environment._definitionCache &&
        environment._definitionCache.store &&
        environment._definitionCache.store.clear();
    }
  }

  if (owner.__container__) {
    clearIfHasProperty(owner.base.__container__.cache, name);
    clearIfHasProperty(owner.base.__container__.factoryCache, name);
    clearIfHasProperty(owner.base.__container__.factoryManagerCache, name);
    clearIfHasProperty(owner.base.__registry__._resolveCache, name);
  }
}

function requireUnsee(module) {
  if (window.requirejs.has(module)) {
    window.requirejs.unsee(module);
  }
}

function clearContainerCache(context, componentName) {
  const componentFullName = `component:${componentName}`;
  const templateFullName = `template:components/${componentName}`;
  const owner = getOwner(context);
  clear(owner, componentFullName);
  clear(owner, templateFullName);
}

export default Service.extend(Evented, {
  reload(name = "test-component") {
    requireUnsee("dummy/components/" + name);
    requireUnsee("dummy/templates/components/" + name);
    clearContainerCache(this, name);
    this.trigger("reload");
  }
});
