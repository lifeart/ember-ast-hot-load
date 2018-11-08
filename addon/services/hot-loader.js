import Service from "@ember/service";
import Evented from "@ember/object/evented";
import { getOwner } from "@ember/application";
import { get } from "@ember/object";

function clearIfHasProperty(obj, propertyName) {
  if (obj && Object.hasOwnProperty.call(obj, propertyName)) {
    obj[propertyName] = undefined;
  }
}

function clear(context, owner, name) {
  if (context.templateCompilerKey) {
    // Ember v3.2
    var templateCompiler = owner.lookup(context.templateCompilerKey);
    var compileTimeLookup = templateCompiler.resolver;
    var compileRuntimeResolver = compileTimeLookup.resolver;
    compileRuntimeResolver.componentDefinitionCache.clear();
  } else if (context.templateOptionsKey) {
    // Ember v3.1.1
    var templateOptions = owner.lookup(context.templateOptionsKey);
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
  if (typeof window !== "object") {
    return;
  }
  if (window.requirejs.has(module)) {
    window.requirejs.unsee(module);
  }
}

function scopedComponents() {
	return Object.keys(window.require.entries).filter(name=>name.includes('/-components/'));
}

function addonComponents(modulePrefix) {
	return Object.keys(window.require.entries).filter(name=>!name.startsWith(modulePrefix));
}

function clearContainerCache(context, componentName) {
  const componentFullName = `component:${componentName}`;
  const templateFullName = `template:components/${componentName}`;
  const owner = getOwner(context);
  clear(context, owner, componentFullName);
  clear(context, owner, templateFullName);
}

export function clearRequirejsCache(config, componentName) {
  const modulePrefix = get(config, "modulePrefix") || "dummy";
  const podModulePrefix = get(config, "podModulePrefix") || modulePrefix;
  // Invalidate regular module
  requireUnsee(`${modulePrefix}/components/${componentName}`);
  requireUnsee(`${modulePrefix}/templates/components/${componentName}`);

  // Invalidate pod modules
  requireUnsee(`${podModulePrefix}/components/${componentName}/component`);
  requireUnsee(`${podModulePrefix}/components/${componentName}/template`);

  // Invalidate MU modules
  requireUnsee(`${podModulePrefix}/src/ui/components/${componentName}/component`);
  requireUnsee(`${podModulePrefix}/src/ui/components/${componentName}/template`);

  scopedComponents().filter((name)=>name.includes(componentName)).forEach((item)=>{
	requireUnsee(item);
  });

  addonComponents(modulePrefix).filter((name)=>name.includes(componentName)).forEach((item)=>{
	requireUnsee(item);
  });
}

export default Service.extend(Evented, {
  templateOptionsKey: null,
  templateCompilerKey: null,
  forgetComponent(name) {
    clearContainerCache(this, name);
  },
  clearRequirejs(name) {
    const owner = getOwner(this);
    const config = owner.resolveRegistration("config:environment");
    clearRequirejsCache(config, name);
  }
});
