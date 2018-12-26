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
const compileTemplate = Ember.HTMLBars.compile;
const COMPONENT_NAMES_CACHE = {};
const DYNAMIC_HELPERS_WRAPPERS_COMPONENTS = {};
var willHotReloadCallbacks = [];
var willLiveReloadCallbacks = [];
var matchingResults = {};

export default Service.extend(Evented, {
  templateOptionsKey: null,
  templateCompilerKey: null,
  useOriginalVendorFile: false,
  scriptDownloadErrors: 0,
  init() {
    this._super(...arguments);
    this.routeScopedComponents = getRouteScopedComponents();
    this.muScopedComponents = getMUScopedComponents();
    this.owner = getOwner(this);
    this.componentLookup = this.owner.lookup('component-lookup:main');
    this.routerService = this.owner.lookup('service:router') || this.owner.lookup('service:-router');
    this.appConfig = this.owner.resolveRegistration('config:environment') || {};
  },
  normalizeComponentName(name) {
    return normalizeComponentName(name);
  },
  currentRouteScopes() {
    const owner = this.owner;
    const config = this.appConfig;
  
    const modulePrefix = get(config, 'modulePrefix') || 'dummy';
    const podModulePrefix = get(config, 'podModulePrefix') || modulePrefix;
    // /routes/patterns.inheritance/-components
    if (!owner.router || !owner.router.currentRouteName) {
      return [];
    }
    const allRouteScopes = owner.router.currentRouteName.split('.');
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
    const owner = this.owner;
    // /routes/patterns.inheritance/-components
    if (!owner.router || !owner.router.currentRouteName) {
      return [];
    }
    const allRouteScopes = owner.router.currentRouteName.split('.');
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
  willHotReloadRouteTemplate(attrs) {
    const meta = getPossibleRouteTemplateMeta(attrs);
    const owner = this.owner;
    if (!meta.looksLikeRouteTemplate) {
      return;
    }
    if (meta.maybeClassicPath) {
      this.forgetComponent(meta.possibleTemplateName);
      const route = owner.lookup(`route:${meta.possibleRouteName}`);
      const router  = this.routerService;
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
      const route = owner.lookup(`route:${routeName}`);
      const router  = this.routerService;
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
    } else if (meta.maybePodsPath) {
      let routeName = meta.possibleRouteName;
      if (routeName.startsWith('.')) {
        routeName = routeName.replace('.', '');
      }
      if (routeName.endsWith('.template')) {
        routeName = routeName.replace('.template', '');
      }
      let maybeRoute = null;
      let paths = routeName.split('.');
      let pathsCount = paths.length;
      for (let i = 0; i < pathsCount; i++) {
        let possibleRouteName = paths.join('.');
        maybeRoute =  owner.lookup(`route:${possibleRouteName}`);
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
      this.forgetComponent(routeName);
      const router  = this.routerService;
      if (!maybeRoute || !router) {
        return window.location.reload();
      }
      if (router.currentRouteName.includes(routeName)) {
        maybeRoute.renderTemplate();
      } else if (router.currentRouteName === 'index' && routeName === 'application') {
        maybeRoute.renderTemplate();
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
  isMatchingComponent(componentName = 'dummy', path = 'empty') {
    let key = String(componentName) + '__' + String(path);
    if (!(key in matchingResults)) {
      matchingResults[key] = matchingComponent(componentName, path);
    }
    return matchingResults[key];
  },
  triggerInRunLoop(name, attrs) {
    if (name === 'willHotReload') {
      willHotReloadCallbacks.forEach(cb => cb(attrs));
      this.willHotReloadRouteTemplate(attrs);
    } else if (name === 'willLiveReload') {
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
    if (typeof name !== 'string') {
      return true;
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
  isFastboot: computed(function() {
    const fastboot = this.owner.lookup('service:fastboot');
    if (!fastboot) {
      return false;
    }
    return getWithDefault(fastboot, 'isFastboot', false);
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
    // todo add hotReloadCustomContext... to resolve deep nesting
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
    const owner = this.owner;
    const component = Component.extend({
      tagName: "",
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
    owner.application.register(
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
