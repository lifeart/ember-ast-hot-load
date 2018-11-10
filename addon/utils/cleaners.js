import { getOwner } from "@ember/application";
import { get } from "@ember/object";

function isMUTemplateOrComponent(name, componentName) {
  if (!name.includes("component:") && !name.includes("template:")) {
    return false;
  }
  return name.endsWith("/" + componentName);
}

function clearIfHasProperty(obj, propertyName, componentName) {
  if (obj) {
    const itemsToForget = Object.keys(obj).filter(name => {
      return (
        isMUTemplateOrComponent(name, componentName) || propertyName === name
      );
    });

    //component:/emberfest/routes/application/-components/footer-prompt
    //template:/emberfest/routes/index/-components/conference-day/conference-session: FactoryManager
    itemsToForget.forEach(item => {
      obj[item] = undefined;
    });
  }
}

function clear(context, owner, name, originalName) {
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
    clearIfHasProperty(owner.base.__container__.cache, name, originalName);
    clearIfHasProperty(
      owner.base.__container__.factoryCache,
      name,
      originalName
    );
    clearIfHasProperty(
      owner.base.__container__.factoryManagerCache,
      name,
      originalName
    );
    clearIfHasProperty(
      owner.base.__registry__._resolveCache,
      name,
      originalName
    );
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
  return Object.keys(window.require.entries).filter(name =>
    name.includes("/-components/")
  );
}

function addonComponents(modulePrefix) {
  return Object.keys(window.require.entries).filter(
    name => !name.startsWith(modulePrefix)
  );
}

export function clearContainerCache(context, componentName) {
  const componentFullName = `component:${componentName}`;
  const templateFullName = `template:components/${componentName}`;
  //component:/emberfest/routes/application/-components/footer-prompt
  //template:/emberfest/routes/index/-components/conference-day/conference-session: FactoryManager
  const owner = getOwner(context);
  clear(context, owner, componentFullName, componentName);
  clear(context, owner, templateFullName, componentName);
}

export function clearRequirejsCache(context, componentName) {
  const owner = getOwner(context);
  const config = owner.resolveRegistration("config:environment");

  const modulePrefix = get(config, "modulePrefix") || "dummy";
  const podModulePrefix = get(config, "podModulePrefix") || modulePrefix;
  // Invalidate regular module
  requireUnsee(`${modulePrefix}/components/${componentName}`);
  requireUnsee(`${modulePrefix}/templates/components/${componentName}`);

  // Invalidate pod modules
  requireUnsee(`${podModulePrefix}/components/${componentName}/component`);
  requireUnsee(`${podModulePrefix}/components/${componentName}/template`);

  // Invalidate MU modules
  requireUnsee(
    `${podModulePrefix}/src/ui/components/${componentName}/component`
  );
  requireUnsee(
    `${podModulePrefix}/src/ui/components/${componentName}/template`
  );

  scopedComponents()
    .filter(
      name =>
        name.endsWith(componentName + "/component") ||
        name.endsWith(componentName + "/template") ||
        name.endsWith(componentName)
    )
    .forEach(item => {
      requireUnsee(item);
    });

  addonComponents(modulePrefix)
    .filter(
      name =>
        name.endsWith(componentName + "/component") ||
        name.endsWith(componentName + "/template") ||
        name.endsWith(componentName)
    )
    .forEach(item => {
      requireUnsee(item);
    });
}

export default {};
