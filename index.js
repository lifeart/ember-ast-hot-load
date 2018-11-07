'use strict';

module.exports = {
  name: 'ember-ast-hot-load',

  init() {
    this._super.init && this._super.init.apply(this, arguments);
  },
  serverMiddleware: function (config){
    var lsReloader = require('./lib/hot-reloader')(config.options, ['components']);
    lsReloader.run();
  },
  setupPreprocessorRegistry(type, registry) {

      let pluginObj = this._buildPlugin();
      pluginObj.parallelBabel = {
        requireFile: __filename,
        buildUsing: '_buildPlugin',
        params: {},
      };
      registry.add('htmlbars-ast-plugin', pluginObj);
    
  },

  _buildPlugin() {
    return {
      name: 'component-attributes',
      plugin: require('./lib/ast-transform'),
      baseDir() {
        return __dirname;
      },
    };
  },

  included() {
    this._super.included.apply(this, arguments);

    // if (!this.shouldPolyfill) {
    //   return;
    // }

    // this.import('vendor/angle-bracket-invocation-polyfill/runtime-polyfill.js');
  },

  treeForVendor(rawVendorTree) {
    if (!this.shouldPolyfill) {
      return;
    }

    let babelAddon = this.addons.find(addon => addon.name === 'ember-cli-babel');

    let transpiledVendorTree = babelAddon.transpileTree(rawVendorTree, {
      babel: this.options.babel,

      'ember-cli-babel': {
        compileModules: false,
      },
    });

    return transpiledVendorTree;
  },
};