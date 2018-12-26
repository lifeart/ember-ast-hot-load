import { getOwner } from "@ember/application";
import { get } from "@ember/object";

function isMUTemplateOrComponent(name, componentName) {
  if (!name.includes("component:") && !name.includes("template:")) {
    return false;
  }
  const isRouteTemplateName = (name === `template:` + componentName);
  const isMURouteTemplateName = name.includes("template:") && name.endsWith('/routes/' + componentName + '/template.hbs');
  const isMURouteScopedComponent = name.includes('/-components/') && (name.split('-components').pop().includes(componentName.split('-components').pop()));
  return name.endsWith("/" + componentName) || isRouteTemplateName || isMURouteTemplateName || isMURouteScopedComponent;
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
  if (context.get('templateCompilerKey')) {
    // Ember v3.2
    var templateCompiler = owner.lookup(context.get('templateCompilerKey'));
    var compileTimeLookup = templateCompiler.resolver;
    var compileRuntimeResolver = compileTimeLookup.resolver;
    compileRuntimeResolver.componentDefinitionCache.clear();
  } else if (context.get('templateOptionsKey')) {
    // Ember v3.1.1
    var templateOptions = owner.lookup(context.get('templateOptionsKey'));
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

// function scopedComponents() {
//   return Object.keys(window.require.entries).filter(name =>
//     name.includes("/-components/")
//   );
// }

function addonComponents(modulePrefix) {
  return Object.keys(window.require.entries).filter(
    name => !name.startsWith(modulePrefix)
  );
}

export function clearContainerCache(context, componentName) {
  const componentFullName = `component:${componentName}`;
  const templateFullName = `template:components/${componentName}`;
  // case for route template
  const routeTemplateFullName = `template:${componentName}`;
  //component:/emberfest/routes/application/-components/footer-prompt
  //template:/emberfest/routes/index/-components/conference-day/conference-session: FactoryManager
  const owner = getOwner(context);
  clear(context, owner, componentFullName, componentName);
  clear(context, owner, templateFullName, componentName);
  // case for route template
  clear(context, owner, routeTemplateFullName, componentName);
  // clear route template for pods
  clear(context, owner, routeTemplateFullName.split('.').join('/'), componentName.split('.').join('/'));
}

export function clearRequirejsCache(context, componentName) {
  const owner = getOwner(context);
  const config = owner.resolveRegistration("config:environment");

  const modulePrefix = get(config, "modulePrefix") || "dummy";
  const podModulePrefix = get(config, "podModulePrefix") || modulePrefix;
  // Invalidate regular module
  requireUnsee(`${modulePrefix}/components/${componentName}`);
  requireUnsee(`${modulePrefix}/templates/components/${componentName}`);
  // classic route template
  requireUnsee(`${modulePrefix}/templates/${componentName}`);

  // mu route template unsee
  if (componentName.startsWith('/')) {
    requireUnsee(`${podModulePrefix}/src/ui/routes${componentName}`);
  } else {
    requireUnsee(`${podModulePrefix}/src/ui/routes/${componentName}`);
  }

  // Invalidate pod modules
  requireUnsee(`${podModulePrefix}/components/${componentName}/component`);
  requireUnsee(`${podModulePrefix}/components/${componentName}/template`);
  // pod route template
  requireUnsee(`${podModulePrefix}/${componentName}/template`);

  // for PODS routes, in case of
  // frontend/pods/protected/patients/patient/clinical-data/template
  // returned like pods/protected/patients/patient/clinical-data/template
  requireUnsee(`${modulePrefix}/${componentName}`);

  // mu route scoped components, resolved with prefix
  if (componentName.includes('/-components')) {
    const paths = componentName.split('/-components/');
    const relativeComponentName = paths[1];
    let routePath = paths[0].replace(`${podModulePrefix}/routes/`, '');
    if (routePath.startsWith('/')) {
      routePath = routePath.replace('/','');
    }
    // "shiny-components/src/ui/routes/patterns/inheritance/-components/modal/component"
    // `/${podModulePrefix}/routes/${scope}/-components/`;
    requireUnsee(
      `${podModulePrefix}/src/ui/routes/${routePath}/-components/${relativeComponentName}/component`
    );
    requireUnsee(
      `${podModulePrefix}/src/ui/routes/${routePath}/-components/${relativeComponentName}/template`
    );
  }
  // Invalidate MU modules
  requireUnsee(
    `${podModulePrefix}/src/ui/components/${componentName}/component`
  );
  requireUnsee(
    `${podModulePrefix}/src/ui/components/${componentName}/template`
  );

  // scopedComponents()
  //   .filter(
  //     name =>
  //       name.endsWith(componentName + "/component") ||
  //       name.endsWith(componentName + "/template") ||
  //       name.endsWith(componentName)
  //   )
  //   .forEach(item => {
  //     requireUnsee(item);
  //   });

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
