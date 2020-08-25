import Service from "@ember/service";
import Evented from "@ember/object/evented";
import Component from "@ember/component";
import { getOwner } from "@ember/application";
import { get, computed, getWithDefault } from "@ember/object";
import { camelize, capitalize } from "@ember/string";
// import { compileTemplate } from "@ember/template-compilation";
import {
  clearRequirejsCache,
  clearContainerCache
} from "ember-ast-hot-load/utils/cleaners";
import { matchingComponent, hasValidHelperName,
  getMUScopedComponents,
  getRouteScopedComponents } from "ember-ast-hot-load/utils/matchers";
import {
  normalizeComponentName,
  getPossibleRouteTemplateMeta,
  componentNameFromClassName
 } from "ember-ast-hot-load/utils/normalizers";

import Ember from "ember";
/* eslint-disable ember/new-module-imports */
const COMPONENT_NAMES_CACHE = {};
const DYNAMIC_HELPERS_WRAPPERS_COMPONENTS = {};
const REQUIRE_CLEAR_CACHE = [];
const FORGET_CACHE = [];
var willHotReloadCallbacks = [];
var willLiveReloadCallbacks = [];
var matchingResults = {};

function compileTemplate(templateString, options) {
  let template = Ember.HTMLBars.template;
  let precompile = Ember.HTMLBars.precompile;
  let precompiledTemplateString = precompile(templateString, options);
  let templateJS = JSON.parse(precompiledTemplateString);
  return template(templateJS);
}

function stripRouteTemplatePostfix(name) {
  return name.endsWith('.template') ? name.replace('.template', '') : name;
}
function stripRouteTemplatePrefix(name) {
  return name.startsWith('.') ? name.replace('.', '') : name;
}
function shouldRenderTemplate(currentRouteName, possibleRouteName) {
  if (currentRouteName.includes(possibleRouteName)) {
    return true;
  } else if (currentRouteName === 'index' && possibleRouteName === 'application') {
    return true;
  } else {
    return false;
  }
}

export default Service.extend(Evented, {
  templateOptionsKey: null,
  templateCompilerKey: null,
  useOriginalVendorFile: false,
  scriptDownloadErrors: 0,
  iterationId: 0,
  init() {
    this._super(...arguments);
    this.routeScopedComponents = getRouteScopedComponents();
    this.muScopedComponents = getMUScopedComponents();
    this.owner = getOwner(this);
    this.componentLookup = this.owner.lookup('component-lookup:main');
    this.routerService = this.owner.lookup('service:router') || this.owner.lookup('service:-router');
    this.appConfig = this.owner.resolveRegistration('config:environment') || {};
    this.modulePrefix = get(this.appConfig, 'modulePrefix') || 'dummy';
    this.podModulePrefix = get(this.appConfig, 'podModulePrefix') || this.modulePrefix;
  },
  normalizeComponentName(name) {
    return normalizeComponentName(name);
  },
  hasActiveRoute() {
    if (!this.owner.router || !this.owner.router.currentRouteName) {
      return false;
    } else {
      return true;
    }
  },
  currentRouteName() {
    return this.owner.router.currentRouteName;
  },
  currentRouteScopes() {
    const podModulePrefix = this.podModulePrefix;
    // /routes/patterns.inheritance/-components
    if (!this.hasActiveRoute()) {
      return [];
    }
    const allRouteScopes = this.currentRouteName().split('.');
    const scopes = [];
    for (let i = 1; i <= allRouteScopes.length; i++) {
      scopes.push(allRouteScopes.slice(0, i).join('/'));
    }
    scopes.push('application');
    return scopes.map((scope)=>{
      return `/${podModulePrefix}/routes/${scope}/-components/`;
    });
  },
  currentRouteComponents() {
    // /routes/patterns.inheritance/-components
    if (!this.hasActiveRoute()) {
      return [];
    }
    const allRouteScopes = this.currentRouteName().split('.');
    const scopes = [];
    for (let i = 1; i <= allRouteScopes.length; i++) {
      scopes.push(allRouteScopes.slice(0, i).join('.'));
    }
    scopes.push('application');
    const result = [];
    scopes.forEach((path)=>{
      if (this.routeScopedComponents[path]) {
        this.routeScopedComponents[path].forEach((componentName)=>{
          if (!componentName.includes('/-')) {
            result.push(componentName);
          }
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
  routeByPath(path) {
    return this.owner.lookup(`route:${path}`);
  },
  reloadWindow() {
    if (this.isFastBoot) {
      return;
    }
    return window.location.reload();
  },
  willHotReloadRouteTemplate(attrs) {
    const meta = getPossibleRouteTemplateMeta(attrs);
    if (!meta.looksLikeRouteTemplate) {
      return;
    }
    const currentRouteName = this.hasActiveRoute() ? this.currentRouteName() : '';
    if (meta.maybeClassicPath) {
      this.forgetComponent(meta.possibleTemplateName, false);
      const route = this.routeByPath(meta.possibleRouteName);
      if (!route) {
        return this.reloadWindow();
      }
      if (shouldRenderTemplate(currentRouteName, meta.possibleRouteName)) {
        route.renderTemplate();
      }
    } else if (meta.isMU) {
      let routeName = stripRouteTemplatePrefix(meta.possibleRouteName);
      routeName  = stripRouteTemplatePostfix(routeName);
      this.forgetComponent(routeName, true);
      const route = this.routeByPath(routeName);
      if (!route) {
        return this.reloadWindow();
      }
      if (shouldRenderTemplate(currentRouteName, routeName)) {
        route.renderTemplate();
      }
    } else if (meta.maybePodsPath) {
      let routeName = stripRouteTemplatePrefix(meta.possibleRouteName);
      routeName  = stripRouteTemplatePostfix(routeName);
      let maybeRoute = null;
      let paths = routeName.split('.');
      let pathsCount = paths.length;
      for (let i = 0; i < pathsCount; i++) {
        let possibleRouteName = paths.join('.');
        maybeRoute =  this.routeByPath(possibleRouteName);
        if (maybeRoute) {
          routeName = possibleRouteName;
          break;
        } else {
          if (paths.length === 0) {
            break;
          }
          paths.shift();
        }
      }
      this.forgetComponent(routeName, false);
      if (!maybeRoute) {
        return this.reloadWindow();
      }
      if (shouldRenderTemplate(currentRouteName, routeName)) {
        maybeRoute.renderTemplate();
      }
	} else {
      return this.reloadWindow();
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
  isMatchingComponent(componentName = 'dummy', path = 'empty') {
    let key = String(componentName) + '__' + String(path);
    if (!(key in matchingResults)) {
      matchingResults[key] = matchingComponent(componentName, path);
    }
    return matchingResults[key];
  },
  triggerInRunLoop(name, attrs) {
	if (!this.__isAlive()) {
		return;
	}
    this.incrementProperty('iterationId');
    if (name === 'willHotReload') {
      willHotReloadCallbacks.forEach(cb => cb(attrs));
      this.willHotReloadRouteTemplate(attrs);
    } else if (name === 'willLiveReload') {
      willLiveReloadCallbacks.forEach(cb => cb(attrs));
      this.willLiveReloadRouteTemplate(attrs);
    }
  },
  _willHotReloadCallbacksCount() {
    return willHotReloadCallbacks.length;
  },
  _willLiveReloadCallbacksCount() {
    return willLiveReloadCallbacks.length;
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
  forgetComponent(name, isMU = true) {
    const cacheKey = this.iterationId + '/' + name + '/' + isMU;
    if (FORGET_CACHE.includes(cacheKey)) {
      return;
    }
    if (isMU) {
      const muNames = this.getPossibleMUComponentNames(name);
      muNames.forEach((possibleMuName)=>{
        clearContainerCache(this, possibleMuName);
      });
    }
    clearContainerCache(this, name);
    FORGET_CACHE.push(cacheKey);
  },
  clearRequirejs(name) {
    const cacheKey = this.iterationId + '/' + name;
    if (REQUIRE_CLEAR_CACHE.includes(cacheKey)) {
      return;
    }
    const muNames = this.getPossibleMUComponentNames(name);
    muNames.forEach((possibleMuName)=>{
      clearRequirejsCache(this, possibleMuName);
    });
    clearRequirejsCache(this, name);
    REQUIRE_CLEAR_CACHE.push(cacheKey);
  },
  addDynamicHelperWrapperComponent(name) {
    DYNAMIC_HELPERS_WRAPPERS_COMPONENTS[name] = true;
  },
  hasDynamicHelperWrapperComponent(name) {
    return name in DYNAMIC_HELPERS_WRAPPERS_COMPONENTS;
  },
  isComponent(name, currentContext) {
    // todo - must be route-related logic
    if (typeof name !== 'string') {
      return true;
    }
    if (name.includes('.')) {
      return false;
    }
    if (!(name in COMPONENT_NAMES_CACHE)) {
      // classic + pods, can check names and nested/names
      COMPONENT_NAMES_CACHE[name] = this._isComponent(name);
      // MU stuff
      if (!COMPONENT_NAMES_CACHE[name]) {
      // ui/routes/foo/-components/baz/bar
      COMPONENT_NAMES_CACHE[name] = this._isMUComponent(name, currentContext);
      }
      //  ||
      // this._isComponent(dasherize(name)) ||
      // this._isComponent(capitalize(camelize(name)));
    }
    return COMPONENT_NAMES_CACHE[name];
  },
  isFastBoot: computed('owner', function() {
    const fastboot = this.owner.lookup('service:fastboot');
    if (!fastboot) {
      return false;
    }
    return getWithDefault(fastboot, 'isFastBoot', false);
  }),
  isHelper(name) {
    if (!hasValidHelperName(name)) {
      return false;
    }
    return this.owner.application.hasRegistration('helper:' + name);
  },
  // for mu support components like src/components/tabs/tab
  extractNamesFromContext(context, result = []) {
    if (
      typeof context !== 'object'
      || context === null
      || !context.args
      || !context.args.hotReloadCUSTOMName) {
      return result;
    } else {
      result.push(this.normalizeComponentName(context.args.hotReloadCUSTOMName));
    }
    return this.extractNamesFromContext(context.args.hotReloadCUSTOMhlContext, result);
  },
  _scopedComponentNames(name, scope) {
    const closestRelativeName = [].concat(this.muScopedComponents, this.currentRouteComponents())
      .filter((resolvedName)=>resolvedName.endsWith(name)).pop();
    // closestRelativeName can be undefined
    if (!scope) {
      return [closestRelativeName, name];
    }
    const normalizedContext = componentNameFromClassName(scope.constructor.name);
    const candidate = normalizedContext + '/' + name;
    const result = [];
    if (typeof closestRelativeName === 'string') {
      result.push(closestRelativeName);
    }
    if (candidate !== 'class/' + name) {
      if (!result.includes(candidate)) {
        result.push(candidate);
      }
    }
    // todo add hotReloadCUSTOMhlContext... to resolve deep nesting
    const namesFromContext = this.extractNamesFromContext(scope).reverse();
    for (let i = 1; i <= namesFromContext.length; i++) {
      const possibleNamePaths = namesFromContext.slice(0, i);
      possibleNamePaths.push(name);
      result.push(possibleNamePaths.join('/'));
    }
    // console.log('_scopedComponentNames', result);
    return result;
  },
  scopedComponentNames(name, scope) {
    return this._scopedComponentNames(name, scope).filter((componentName)=>{
      return typeof componentName === 'string';
    });
  },
  _isMUComponent(name, currentContext) {
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
    if (!isComponent) {
      names.forEach((possibleComponentName)=>{
      if (this._isComponent(possibleComponentName)) {
        isComponent = true;
      }
      });
    }
    return isComponent;
  },
  _isComponent(rawName) {
    if (typeof rawName === 'object' && rawName !== null) {
      return true;
    }
    const name = (rawName || '');
    if (this.isHelper(name)) {
      return false;
    }
    const lookup = this.componentLookup;
    try {
      if (!lookup.componentFor) {
      return !!lookup.lookupFactory(name);
      }

      let hasComponent = false;
      try {
      hasComponent = !!lookup.componentFor(name, this.owner);
      if (!hasComponent) {
        throw new Error('Unable to resolve component class');
      }
      } catch (err) {
      try {
        hasComponent = !!lookup.layoutFor(name, this.owner);
      } catch (error) {
        hasComponent = false;
      }
      }
      return hasComponent;
    } catch (err) {
      return false;
    }
  },
  dynamicComponentNameForHelperWrapper(name) {
    return `helper ${name}`;
	},
	renderDynamicComponentHelper() {
    // console.log('renderDynamicComponentHelper', ...arguments);
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
    const component = Component.extend({
      tagName: "",
      // eslint-disable-next-line ember/require-computed-property-dependencies
      layout: computed(function() {
      let positionalParams = (this._params || []).map((param, index)=>{
        return `(get this._params "${index}")`;
      }).join(" ")
      let attrs = this['attrs'] || {};
      const attributesMap = Object.keys(attrs)
        .filter(key => key !== '_params' && !key.startsWith('hotReload'))
        .map(key => `${key}=this.attrs.${key}`)
        .join(' ');
      const tpl = `{{${name} ${positionalParams} ${attributesMap}}}`;
      return compileTemplate(tpl);
      })
    });
    component.reopenClass({
      positionalParams: '_params'
    });
    this.owner.application.register(
      `component:${this.dynamicComponentNameForHelperWrapper(name)}`,
      component
    );
  },
  printError(name) {
    window['console'].info(`

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
