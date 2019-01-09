"use strict";
const path = require("path");
const fs = require("fs");

const ADDON_NAME = "ember-ast-hot-load";

module.exports = {
  name: ADDON_NAME,
  // attempt to fix unknown options bug
  _OPTIONS: {
    enabled: true,
    watch: ["components"],
    helpers: []
  },
  serverMiddleware: function (config) {
    if (config.options.environment === 'production' || config.options.environment === 'test') {
      return;
    }
    if (!this._OPTIONS || !this._OPTIONS.enabled) {
      return;
    }
    require("./lib/hot-load-middleware")(
      config, 
      this._OPTIONS
    ).run();
    
    require("./lib/hot-reloader")(
      config.options,
      this._OPTIONS.watch
    ).run();
  },
  setupPreprocessorRegistry(type, registry) {
    if (!this.isEnabled()) {
      return;
    }
    console.log('setupPreprocessorRegistryCall');
    console.log('this._ENV', this._ENV);
    console.log('type', type);
    console.log('options', this._OPTIONS);
    console.log('isEnabled', this.isEnabled());

    let pluginObj = this._buildPlugin(this);
    const _ctx = this;
    this._buildPliginWithContext = function() {
      return _ctx._buildPlugin(_ctx);
    }
    pluginObj.parallelBabel = {
      requireFile: __filename,
      buildUsing: "_buildPliginWithContext",
      params: {}
    };
    registry.add("htmlbars-ast-plugin", pluginObj);
  },
  _buildPlugin(_this) {
    console.log('_buildPluginCall');
    const ctx = this;
    return {
      name: "ember-ast-hot-load-babel-plugin",
      plugin(env) {
        if (!_this || !ctx) {
          console.log(
            'unable to find _this', this 
          );
        }
        console.log('ctx', ctx);
        console.log('THIS', _this);
        if (!_this._OPTIONS) {
          console.log('unable to find options', _this);
          return function () {};
        }
        if (!_this._OPTIONS.enabled) {
          console.log('isDisabled, noop');
          return function () {};
        }
        if (!_this.isEnabled()) {
          console.log('isDisabled, noop');
          return function () {};
        }
        console.log('sss', _this);
        console.log('plugin-env', env);
        console.log('plugin-_ENV', _this._ENV);
        console.log('plugin-_OPTIONS',  _this._OPTIONS);
        console.log('plugin-isEnabled',  _this.isEnabled());
        return require("./lib/ast-transform").call(this, env, _this._OPTIONS);
      },
      baseDir() {
        return __dirname;
      }
    };
  },
  _ensureFindHost() {
    if (!this._findHost) {
      this._findHost = function findHostShim() {
        let current = this;
        let app;
        do {
          app = current.app || app;
        } while (current.parent.parent && (current = current.parent));
        return app;
      };
    }
  },
  config(environment) {
    this._ENV = environment;
    console.log('_config', environment);
    return {
      [ADDON_NAME]: {
        enabled: this.isValidEnv(environment),
        watch: ["components"],
        helpers: []
      }
    };
  },
  _getTemplateCompilerPath() {
    const npmCompilerPath = path.join(
      "ember-source",
      "dist",
      "ember-template-compiler.js"
    );
    let resolvedPath = null;
    let root = this.project.root;
    try {
      resolvedPath = path.relative(root, require.resolve(npmCompilerPath));
    } catch(e) {
      try {
        resolvedPath = path.relative(root, require.resolve(path.join(root, 'node_modules', npmCompilerPath)));
      } catch (ee) {
        try {
          resolvedPath = path.relative(root, require.resolve(path.join(root, '../node_modules', npmCompilerPath)));
        } catch (eee) {
          resolvedPath = path.relative(root, require.resolve(path.join(root, '../../node_modules', npmCompilerPath)));
        }
      }
    }
    return resolvedPath;
  },
  _assignOptions(app) {
    let appOptions = app.options || {};
    let addonOptions = appOptions[ADDON_NAME] || {};
    let currentOptions = Object.assign({
        enabled: true,
        helpers: [],
        watch: ["components"],
        templateCompilerPath: undefined
      },
      addonOptions
    );
    let {
      enabled,
      helpers,
      watch,
      templateCompilerPath = undefined
    } = currentOptions;
    this._OPTIONS = {
      helpers,
      enabled,
      watch,
      templateCompilerPath
    };
    this._isDisabled = !enabled;
  },

  included(app) {
    this._super.included.apply(this, arguments);
    console.log('ast-included');
    this._ensureFindHost();
    let host = this._findHost();
    this._assignOptions(host);
    if (!this.isValidEnv(app.env)) {
      this._isDisabled = true;
      this._ENV = app.env;
      if (this._OPTIONS) {
        this._OPTIONS.enabled = !this._isDisabled;
      }
      return;
    }
    // this._OPTIONS.enabled = !this._isDisabled;
    // Require template compiler as in CLI this is only used in build, we need it at runtime
    const npmPath =
      this._OPTIONS["templateCompilerPath"] || this._getTemplateCompilerPath();
    if (fs.existsSync(npmPath)) {
      app.import(npmPath);
    } else {
      throw new Error(
        "Unable to locate ember-template-compiler.js. ember/ember-source not found in node_modules"
      );
    }
  },

  isEnabled() {
    return !this._isDisabled;
  },
  isValidEnv(name) {
    if (!name) {
      return false;
    }
    return (name !== 'production' && name !== 'test');
  },
  treeForVendor(rawVendorTree) {
    if (!this.isValidEnv(this._ENV)) {
      this._isDisabled = true;
    }
    if (this._isDisabled) {
      return this._super.treeForVendor.apply(this, arguments);
    }
    if (!rawVendorTree) {
      return this._super.treeForVendor.apply(this, arguments);
    }

    let babelAddon = this.addons.find(
      addon => addon.name === "ember-cli-babel"
    );

    let transpiledVendorTree = babelAddon.transpileTree(rawVendorTree, {
      babel: this.options.babel,
      "ember-cli-babel": {
        compileModules: false
      }
    });

    return transpiledVendorTree;
  }
};
