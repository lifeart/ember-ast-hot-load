"use strict";
const path = require("path");
const fs = require("fs");
const map = require('broccoli-stew').map;
const rm = require('broccoli-stew').rm;

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
    if (this.isDisabled()) {
      return;
    } else {
      require("./lib/hot-load-middleware")(
        config, 
        this._OPTIONS
      ).run();
      
      require("./lib/hot-reloader")(
        config.options,
        this._OPTIONS.watch
      ).run();
    }
  },
  setupPreprocessorRegistry(type, registry) {
    let pluginObj = this._buildPlugin({addonContext: {
      _OPTIONS: this._OPTIONS
    }});
    //parallelBabel proper integration?
    pluginObj.parallelBabel = {
      requireFile: __filename,
      buildUsing: "_buildPlugin",
      params: { addonContext: {
        _OPTIONS: this._OPTIONS
      }}
    };
    registry.add("htmlbars-ast-plugin", pluginObj);
  },

  _buildPlugin({addonContext}) {
    const plugin = require("./lib/ast-transform")({addonContext});
    return {
      name: "ember-ast-hot-load-babel-plugin",
      plugin,
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
    return {
      [ADDON_NAME]: {
        enabled: environment !== "production",
        watch: ["components"],
        helpers: []
      }
    };
  },
  _getTemplateCompilerPath() {
    if (this._OPTIONS && this._OPTIONS["templateCompilerPath"]) {
      return this._OPTIONS["templateCompilerPath"];
    }
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
    const env = app.env;
    this._ENV = env;
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
    if (env === 'test' || env === 'production') {
      // allow test/prod addon usage only for app, named "dummy" (addon test app)
      if (app.name !== 'dummy') {
        enabled = false;
      }
    }
    this._OPTIONS = Object.assign(this._OPTIONS, {
      helpers,
      enabled,
      watch,
      templateCompilerPath
    });
    this._OPTIONS.initialized = true;
    this._isDisabled = !enabled;
  },
  importTransforms() {
    return {
      'fastboot-safe': {
        transform(tree) {
          return map(tree, (content)=>{
            return `
              ;if (typeof FastBoot === 'undefined') {
                ${content}
              };
            `;
          });
        },

        processOptions(assetPath, entry, options) {
          options[assetPath] = {};
          return options;
        },
      },
    };
  },
  included(app) {
    this._super.included.apply(this, arguments);
    let host = this._findHost();
    this._assignOptions(host);
    if (this.isDisabled()) {
      return;
    }
    // this._setupPreprocessorRegistry('app', app.registry);
    // Require template compiler as in CLI this is only used in build, we need it at runtime
    const npmPath = this._getTemplateCompilerPath();
    if (fs.existsSync(npmPath)) {
      app.import(npmPath,{
        using: [
          { transformation: 'fastboot-safe'}
        ]
      });
    } else {
      throw new Error(
        "Unable to locate ember-template-compiler.js. ember/ember-source not found in node_modules"
      );
    }
  },
  isDisabled() {
    return this._isDisabled;
  },
  isEnabled() {
    return !this.isDisabled();
  },
  treeFor(name) {
    if (!this.isDisabled()) {
      return this._super.treeFor.apply(this, arguments);
    }
    if (name === 'app' || name === 'addon') {
      return rm(
        this._super.treeFor.apply(this, arguments), 
        'ember-ast-hot-load/**', 
        'components/hot-content.js',
        'components/hot-placeholder.js',
        'helpers/hot-load.js',
        'instance-initializers/hot-loader-livereload-plugin.js',
        'instance-initializers/resolver-hot-loader-patch.js',
        'services/hot-loader.js',
        'utils/cleaners.js',
        'utils/matchers.js',
        'utils/normalizers.js'
      );
    }
    return this._super.treeFor.apply(this, arguments);
  },
  // treeForAddon(tree) {
  //   if (this.isDisabled()) {
  //     const mappedTreee = map(tree, (content, path)=>{
  //       if (path.endsWith('.js') || path.endsWith('.ts')) {
  //         if (path.includes('instance-initializers')) {
  //           return 'export function initialize() {};';
  //         }
  //         return 'export default undefined;';
  //       } else {
  //         return '';
  //       }
  //     });
  //     return this._super.treeForAddon.call(this, rm(mappedTreee, '*/*'));
  //   } else {
  //     return this._super.treeForAddon.call(this, tree);
  //   }
  // },
  treeForVendor(rawVendorTree) {
    if (this.isDisabled()) {
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
