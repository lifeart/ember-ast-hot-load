import Service from "@ember/service";
import Evented from "@ember/object/evented";
import Component from "@ember/component";
import { getOwner } from "@ember/application";
import { get, computed, getWithDefault } from "@ember/object";
import { dasherize, camelize, capitalize, decamelize } from "@ember/string";
import { compileTemplate } from "@ember/template-compilation";
import {
  clearRequirejsCache,
  clearContainerCache
} from "ember-ast-hot-load/utils/cleaners";
const COMPONENT_NAMES_CACHE = {};
const DYNAMIC_HELPERS_WRAPPERS_COMPONENTS = {};
var willHotReloadCallbacks = [];
var willLiveReloadCallbacks = [];

function isValidPath(path) {
  return path.endsWith(".ts") || path.endsWith(".hbs") || path.endsWith(".js");
}

function dasherizePath(str = "") {
  return str
    .split("/")
    .map(dasherize)
    .join("/")
    .trim();
}

function normalizePath(path) {
  return dasherizePath(path.split("\\").join("/"));
}

function looksLikeRouteTemplate(path) {
  // mu app case
  if (path.includes('/src/ui/')) {
    return path.includes('/routes/') && path.endsWith('/template.hbs') && !path.includes('/-components/');
  }
  return !path.includes('component') && path.endsWith('.hbs');
}

function matchingComponent(rawComponentName, path) {
  if (typeof path !== "string") {
    return false;
  }
  if (typeof rawComponentName !== "string") {
    return false;
  }
  if (!isValidPath(path)) {
    return false;
  }
  let componentName = dasherizePath(rawComponentName);
  let normalizedPath = normalizePath(path);
  let possibleExtensions = [
    ".ts",
    ".js",
    ".hbs",
    "/component.ts",
    "/component.js",
    "/template.hbs"
  ];
  let possibleEndings = possibleExtensions.map(ext => componentName + ext);
  let result = possibleEndings.filter(name => {
    return normalizedPath.endsWith(name);
  }).length;

  return result;
}


function getPossibleRouteTemplateMeta(maybeString = '') {
  const rawPath = String(maybeString || '');
  const path = normalizePath(rawPath).split('/').join('.').replace('.hbs', '');
  const MU_PATH = '.src.ui';
  // pods don't supported this time
  const relativeAppEntrypoint = path.includes(MU_PATH) ? MU_PATH : '.app.';
  const maybePodsPath = path.endsWith('.template');
  const paths = path.split(relativeAppEntrypoint);
  paths.shift();
  const maybeRouteName = paths.join(relativeAppEntrypoint);
  const maybeClassicPath =  maybeRouteName.startsWith('templates.');
  const possibleRouteName = maybeRouteName.replace('templates.', '').replace('routes.','');

  return {
    looksLikeRouteTemplate: looksLikeRouteTemplate(normalizePath(rawPath)),
    possibleRouteName,
    possibleTemplateName: possibleRouteName.split('.').join('/'),
    maybeClassicPath,
    maybePodsPath,
    isMU: relativeAppEntrypoint === MU_PATH
  }
}

var matchingResults = {};

function getRouteScopedComponents() {
  const pairs = Object.keys(window.requirejs ? window.requirejs.entries : {})
    .filter(name=>(name.includes('/-components/')))
    .map((name)=>{
		const [ , maybeName = false ] = name.split('/src/ui/routes/');
		if (typeof maybeName === 'string') {
			return maybeName.split('/-components/');
		} else {
			return false;
		}
	}).filter((item)=>(item !== false));
  const result = {};
  pairs.forEach(([routePath, rawComponentRef])=>{
    const normalizedRoute = routePath.split('/').join('.');
    const isTemplate = rawComponentRef.endsWith('/template');
    const substrToReplace = isTemplate ? '/template' : '/component';
    const normalizedComponentName = rawComponentRef.replace(substrToReplace, '');
    if (!result[normalizedRoute]) {
      result[normalizedRoute] = [];
    }
    if (!result[normalizedRoute].includes(normalizedComponentName)) {
      result[normalizedRoute].push(normalizedComponentName);
    }
  });
  return result;
}

export default Service.extend(Evented, {
  templateOptionsKey: null,
  templateCompilerKey: null,
  useOriginalVendorFile: false,
  scriptDownloadErrors: 0,
  init() {
    this._super(...arguments);
    this.routeScopedComponents = getRouteScopedComponents();
  },
  currentRouteScopes() {
    const owner = getOwner(this);
    const config = owner.resolveRegistration("config:environment");
  
    const modulePrefix = get(config, "modulePrefix") || "dummy";
    const podModulePrefix = get(config, "podModulePrefix") || modulePrefix;
    // /routes/patterns.inheritance/-components
    if (!owner.router || !owner.router.currentRouteName) {
      return [];
    }
    const allRouteScopes = owner.router.currentRouteName.split('.');
    const scopes = [];
    for (let i = 1; i <= allRouteScopes.length; i++) {
      scopes.push(allRouteScopes.slice(0, i).join('/'));
    }
    return scopes.map((scope)=>{
      return `/${podModulePrefix}/routes/${scope}/-components/`;
    });
  },
  currentRouteComponents() {
    const owner = getOwner(this);
    // /routes/patterns.inheritance/-components
    if (!owner.router || !owner.router.currentRouteName) {
      return [];
    }
    const allRouteScopes = owner.router.currentRouteName.split('.');
    const scopes = [];
    for (let i = 1; i <= allRouteScopes.length; i++) {
      scopes.push(allRouteScopes.slice(0, i).join('.'));
    }
    const result = [];
    scopes.forEach((path)=>{
      if (this.routeScopedComponents[path]) {
        this.routeScopedComponents[path].forEach((conponentName)=>{
          result.push(conponentName);
        });
      }
    });
    return result;
  },
  getPossibleMUComponentNames(name) {
    const scopes = this.currentRouteScopes();
    return scopes.map((scopeName)=>{
      return scopeName + name;
    });
  },
  willHotReloadRouteTemplate(attrs) {
    const meta = getPossibleRouteTemplateMeta(attrs);
    if (!meta.looksLikeRouteTemplate) {
      return;
    }
    if (meta.maybeClassicPath) {
      this.forgetComponent(meta.possibleTemplateName);
      const route = getOwner(this).lookup(`route:${meta.possibleRouteName}`);
      const router  = getOwner(this).lookup('service:router');
      if (!route || !router) {
        return window.location.reload();
      }
      if (router.currentRouteName.includes(meta.possibleRouteName)) {
        route.renderTemplate();
      } else if (router.currentRouteName === 'index' && meta.possibleRouteName === 'application') {
        route.renderTemplate();
      } else { 
        // else template will be updated after transition
      }
    } else if (meta.isMU) {
      let routeName = meta.possibleRouteName;
      if (routeName.startsWith('.')) {
        routeName = routeName.replace('.', '');
      }
      if (routeName.endsWith('.template')) {
        routeName = routeName.replace('.template', '');
      }
      this.forgetComponent(routeName);
      const route = getOwner(this).lookup(`route:${routeName}`);
      const router  = getOwner(this).lookup('service:router');
      if (!route || !router) {
        return window.location.reload();
      }
      if (router.currentRouteName.includes(routeName)) {
        route.renderTemplate();
      } else if (router.currentRouteName === 'index' && routeName === 'application') {
        route.renderTemplate();
      } else { 
        // else template will be updated after transition
      }
    } else {
      window.location.reload();
    }
  },
  willLiveReloadRouteTemplate(attrs) {
    const meta = getPossibleRouteTemplateMeta(attrs.modulePath);
    if (meta.looksLikeRouteTemplate) {
      attrs.cancel  = true;
      this.clearRequirejs(meta.possibleTemplateName);
    }
  },
  __isAlive() {
    return  !this.isDestroyed && !this.isDestroying;
  },
  isMatchingComponent(componentName = "dummy", path = "empty") {
    let key = String(componentName) + "__" + String(path);
    if (!(key in matchingResults)) {
      matchingResults[key] = matchingComponent(componentName, path);
    }
    return matchingResults[key];
  },
  triggerInRunLoop(name, attrs) {
    if (name === "willHotReload") {
      willHotReloadCallbacks.forEach(cb => cb(attrs));
      this.willHotReloadRouteTemplate(attrs);
    } else if (name === "willLiveReload") {
      willLiveReloadCallbacks.forEach(cb => cb(attrs));
      this.willLiveReloadRouteTemplate(attrs);
    }
  },
  registerWillHotReload(fn) {
    willHotReloadCallbacks.push(fn);
  },
  registerWillLiveReload(fn) {
    willLiveReloadCallbacks.push(fn);
  },
  unregisterWillHotReload(fn) {
    willHotReloadCallbacks = willHotReloadCallbacks.filter(f => f !== fn);
  },
  unregisterWillLiveReload(fn) {
    willLiveReloadCallbacks = willLiveReloadCallbacks.filter(f => f !== fn);
  },
  forgetComponent(name) {
    const muNames = this.getPossibleMUComponentNames(name);
    muNames.forEach((possibleMuName)=>{
      clearContainerCache(this, possibleMuName);
    });
    clearContainerCache(this, name);
  },
  clearRequirejs(name) {
    const muNames = this.getPossibleMUComponentNames(name);
    muNames.forEach((possibleMuName)=>{
      clearRequirejsCache(this, possibleMuName);
    });
    clearRequirejsCache(this, name);
  },
  addDynamicHelperWrapperComponent(name) {
    DYNAMIC_HELPERS_WRAPPERS_COMPONENTS[name] = true;
  },
  hasDynamicHelperWrapperComponent(name) {
    return name in DYNAMIC_HELPERS_WRAPPERS_COMPONENTS;
  },
  isComponent(name, currentContext) {
    // todo - must be route-related logic
    if (!(name in COMPONENT_NAMES_CACHE)) {
      // classic + pods
      COMPONENT_NAMES_CACHE[name] = this._isComponent(name);
      // MU stuff
      if (!COMPONENT_NAMES_CACHE[name]) {
        // ui/components/foo-bar/baz
        COMPONENT_NAMES_CACHE[name] = this._isContextedComponent(name, currentContext);
      }
      if (!COMPONENT_NAMES_CACHE[name]) {
        // ui/routes/foo/-components/baz
        COMPONENT_NAMES_CACHE[name] = this._isRouteScopedComponent(name);
      }
      if (!COMPONENT_NAMES_CACHE[name]) {
        // ui/routes/foo/-components/baz/bar
        COMPONENT_NAMES_CACHE[name] = this._isRouteScopedContextedComponent(name, currentContext);
      }
      //  ||
      // this._isComponent(dasherize(name)) ||
      // this._isComponent(capitalize(camelize(name)));
    }
    return COMPONENT_NAMES_CACHE[name];
  },
  isFastboot: computed(function() {
    const fastboot = getOwner(this).lookup("service:fastboot");
    if (!fastboot) {
      return false;
    }
    return getWithDefault(fastboot, 'isFastboot', false);
  }),
  isHelper(name) {
    if (name.includes('@') || name.includes('/') || name.includes('.')) {
      return false;
    }
    const owner = getOwner(this);
    return owner.application.hasRegistration("helper:" + name);
  },
  // for mu support components like src/components/tabs/tab
  _scopedComponentNames(name, scope) {
    const closestRelativeName = this.currentRouteComponents().filter((resolvedName)=>resolvedName.endsWith(name)).pop();
    // closestRelativeName can be undefined
    if (!scope) {
      return [closestRelativeName, name];
    }
    const normalizedContext = decamelize(scope.constructor.name).replace('_component', '').replace('_class','');
    const candidate = camelize(normalizedContext) + '/' + name;
    const result = [closestRelativeName, candidate];
    // todo add hotReloadCustomContext... to resolve deep nesting
    if (scope.args && scope.args.hotReloadCUSTOMName) {
      result.push(scope.args.hotReloadCUSTOMName + '/' + name);
    }
    return result;
  },
  scopedComponentNames(name, scope) {
    return this._scopedComponentNames(name, scope).filter((componentName)=>{
      return typeof componentName === 'string';
    });
  },
  _isRouteScopedComponent(name) {
    const scopes = this.currentRouteScopes();
    let isComponent = false;
    scopes.forEach((scopeForRoute)=>{
      if (this._isComponent(scopeForRoute + name)) {
        isComponent = true;
      }
    });
    return isComponent;
  },
  _isRouteScopedContextedComponent(name, currentContext) {
    const names = this.scopedComponentNames(name, currentContext);
    const scopes = this.currentRouteScopes();
    let isComponent = false;
    scopes.forEach((scopeForRoute) => {
      names.forEach((possibleName) => {
        if (this._isComponent(scopeForRoute + possibleName)) {
          isComponent = true;
        }
      })
    });
    return isComponent;
  },
  _isContextedComponent(name, currentContext) {
    const names = this.scopedComponentNames(name, currentContext);
    let isComponent = false;
    names.forEach((maybeComponentName)=>{
      if (this._isComponent(maybeComponentName)) {
        isComponent = true;
      }
    });
    return isComponent;
  },
  _isComponent(rawName) {
    if (typeof rawName === 'object' && rawName !== null) {
      return true;
    }
    const name = (rawName || '').toLowerCase();
    const owner = getOwner(this);
    if (this.isHelper(name)) {
      return false;
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
  },
  dynamicComponentNameForHelperWrapper(name) {
    return `helper ${name}`;
	},
	renderDynamicComponentHelper() {
    return 'hot-content';
  },
  placeholderComponentName() {
    return 'hot-placeholder';
  },
  registerDynamicComponent(name) {
    if (this.hasDynamicHelperWrapperComponent(name)) {
      return;
    }
    this.printError(name);
    this.addDynamicHelperWrapperComponent(name);
    const owner = getOwner(this);
    const component = Component.extend({
      tagName: "",
      layout: computed(function() {
        let positionalParams = (this._params || []).join(" ");
        let attrs = this["attrs"] || {};
        const attributesMap = Object.keys(attrs)
          .filter(key => key !== "_params")
          .map(key => `${key}=${key}`)
          .join(" ");
        const tpl = `{{${name} ${positionalParams} ${attributesMap}}}`;
        return compileTemplate(tpl);
      })
    });
    component.reopenClass({
      positionalParams: "_params"
    });
    owner.application.register(
      `component:${this.dynamicComponentNameForHelperWrapper(name)}`,
      component
    );
  },
  printError(name) {
    window["console"].info(`

	Oops, looks like helper "${name}" invoked like component (due to 'ember-ast-hot-load' ast transformation).
	Don't worry it's expected behavour because helper "${name}" looks like component ( {{${name}}} or <${capitalize(
      camelize(name)
    )} />)

	to fix this issue, add "${name}" into "ember-cli-build.js" in application config section

	/////////////////////////////////////
	
	let app = new EmberApp(defaults, {
	  'ember-ast-hot-load': {
		  helpers: ["${name}"],
		  enabled: true
	  }
	});

	/////////////////////////////////////

  `);
    return "hot-placeholder";
  }
});
