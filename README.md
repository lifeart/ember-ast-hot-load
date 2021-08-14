ember-ast-hot-load [![npm version](https://badge.fury.io/js/ember-ast-hot-load.svg)](https://badge.fury.io/js/ember-ast-hot-load) [![Build Status](https://travis-ci.com/lifeart/ember-ast-hot-load.svg?branch=master)](https://travis-ci.com/lifeart/ember-ast-hot-load) [![Greenkeeper badge](https://badges.greenkeeper.io/lifeart/ember-ast-hot-load.svg)](https://greenkeeper.io/) [![Maintainability](https://api.codeclimate.com/v1/badges/a0fc242c64b9f50cc92d/maintainability)](https://codeclimate.com/github/lifeart/ember-ast-hot-load/maintainability)
==============================================================================

### Any ember components hot-reloading

Main Idea of this addon - ability to reload changed components without application reloading.

This addon is continuation of the project [ember-cli-hot-loader](https://github.com/adopted-ember-addons/ember-cli-hot-loader) and  includes part of it's codebase.

* __ember-cli__ >= `2.15.1`
* __ember-source__ >= `2.16`

Many thanks to [Toran Billups / @toranb](https://github.com/toranb) for this huge work, support and inspiration!

* `ember-cli-hot-loader` implemented using middleware for  `ember-resolver` and `wrapping` components.
* `ember-ast-hot-load` implemented using compile-time templates `ast` transformations.

| Point  		      | ember-ast-hot-load | ember-cli-hot-loader |
| ------------------  | ------------------ | -------------------- |
| Tagless components  |          +         |           +/-        |
| Glimmer components  |          +         |           -          |
| Classic route templates |         +        |           -         |
| MU route templates  |          +         |           -          |
| reducers reloading  |          -         |           +          |
| performance impact  |         low        |           middle     |
| typescript support  |          +         |            +         |
| Nested components   |          +         |           +/-        |
| code limitations    |			-		   |            +         |
| Ember 2.x           |          ?         |            +         |
| Ember 3.4+          |          +         |            -         |
| Fastboot            |          +         |            -         |
| [Sparkles components](https://github.com/rwjblue/sparkles-component) |          +         |            -         |
| [Hooked components](https://github.com/lifeart/hooked-components)   |          +         |            -         |
| [Custom components](https://github.com/emberjs/rfcs/blob/master/text/0213-custom-components.md)   |          +         |            -         |
| Component wrappers  |          -         |            +         |
| AST integration     |          +         |            -         |
| Resolver 5 support  |          +         |            -         |
| MU support          |          +         |            -         |
| Addons hot-reload   |          +         |            -         |

Installation
------------------------------------------------------------------------------

```
ember install ember-ast-hot-load
```

* Ember.js v3.20 or above
* Ember CLI v3.20 or above
* Node.js v10 or above


## How to use this addon


It should just work without any config.

After the installing, simply run `ember serve` as you normally would. Any changes to component JS/HBS files will result in a hot reload (not a full page reload). If you alter a route, service, or controller ember-cli will do a full page reload.

Hot-reloading Ember [helpers](https://guides.emberjs.com/v3.10.0/templates/writing-helpers/) is not supported.

Because helpers look like components (in the AST) they will be unnecessarily wrapped, e.g. `helper` -> `dynamic component` -> `helper`

To prevent this from happening, you can exclude helpers from the hot-loader pipeline by specifying a list of helper names in the add-on config.

```js
// ember-cli-build.js
new EmberApp(defaults, {
  'ember-ast-hot-load': {
    helpers: ["foo-bar", "liquid-if", ... ],
    enabled: true
  }
});

```

If you don't specify `helpers` in the config the addon will continue to work, but with it will also wrap all your helpers (you can see this in the `ember-inspector` components tab, e.g. `helper "you-app-helper-name"`).

To get a list of all the helpers in your app that hot-reload might think are components, run this script in a debug console in your browner. You can then use this list to configure the add-on.

```js
var componentLikeHelpers = Object.keys(require.entries)
    .filter(name=>(name.includes('/helpers/')|| name.includes('/helper')))
    .filter(name=>!name.includes('/-')).map(name=>{
        let path = name.split('/helpers/');
        return path.pop();
    }).filter(name=>!name.includes('/')).uniq();

console.log(JSON.stringify(componentLikeHelpers))
```

You should also exclude `ember-ast-hot-load` from production builds (to avoid unnecessary calculations)

```js
// ember-cli-build.js
const environment = EmberApp.env();
// ...
const addonsToIgnoreInProdBuilds = [
  environment === 'production' ? 'ember-ast-hot-load' : null
].filter(name => name !== null);

new EmberApp(defaults, {
  addons: {
    blacklist: addonsToIgnoreInProdBuilds
  }
});
```

### Public API?

```js
service('hot-loader')
```

```js
.registerWillHotReload(onHotReload)
```

```js
.unregisterWillHotReload(onHotReload)
```

```js
.registerWillLiveReload(onLiveReload)
```

```js
.unregisterWillLiveReload(onLiveReload)
```

 ```js
  // we need to prevent full app refresh if we can hande changed file.
 function onLiveReload(event) {
    if (event.modulePath.includes('redusers')) {
      event.cancel = true;
      requirejs.unsee('some-module');
    }
 }


 function onHotReload(path) {
    if (path.includes('redusers')) {
      // do some hot-reload magic,
      // for example
      requirejs.resolve('some-module')
    }
 }
 ```

## Known Compatibility Workarounds

#### Serving your Ember app from a different backend (e.g. Rails)

In most development environments, Ember applications are served directly from Ember's development server, e.g. http://localhost:4200.
If you are using a different way of service your Ember app, you may need to override the URL that we use to reload your changes.

```js
  // config/enironment.js

  if (environment === 'development') {
    ENV['ember-ast-hot-load'] = {
      baseUrl: 'http://app.mydomain.test:4200'
    }
  }
```

### Cannot find module
Cannot find module `ember-source\dist\ember-template-compiler.js` in yarn workspaces.

`root.package.json` `workspaces.nohoist: ["**/ember-ast-hot-load"]`


Contributing
------------------------------------------------------------------------------

### Installation

* `git clone <repository-url>`
* `cd ember-ast-hot-load`
* `yarn install`

### Linting

* `yarn lint:hbs`
* `yarn lint:js`
* `yarn lint:js --fix`

### Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

### Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
