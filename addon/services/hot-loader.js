import Service from "@ember/service";
import Evented from "@ember/object/evented";
import Component from "@ember/component";
import { getOwner } from "@ember/application";
import { computed, getWithDefault } from "@ember/object";
import { dasherize, camelize, capitalize } from "@ember/string";
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


function getPossibleRouteTemplateMeta(rawPath) {
  const path = normalizePath(rawPath).split('/').join('.').replace('.hbs', '');
  // pods don't supported this time
  const maybePodsPath = path.endsWith('.template');
  const paths = path.split('.app.');
  paths.shift();
  const maybeRouteName = paths.join('.app.');
  const maybeClassicPath =  maybeRouteName.startsWith('templates.');
  const possibleRouteName = maybeRouteName.replace('templates.', '');

  return {
    looksLikeRouteTemplate: looksLikeRouteTemplate(rawPath),
    possibleRouteName,
    possibleTemplateName: possibleRouteName.split('.').join('/'),
    maybeClassicPath,
    maybePodsPath
  }
}

var matchingResults = {};

export default Service.extend(Evented, {
  templateOptionsKey: null,
  templateCompilerKey: null,
  useOriginalVendorFile: false,
  scriptDownloadErrors: 0,
  init() {
    this._super(...arguments);
  },
  willHotReloadRouteTemplate(attrs) {
    const meta = getPossibleRouteTemplateMeta(attrs);
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
    const owner = getOwner(this);
    return owner.application.hasRegistration("helper:" + name);
  },
  _isComponent(name) {
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
