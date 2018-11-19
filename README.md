ember-ast-hot-load [![Build Status](https://travis-ci.com/lifeart/ember-ast-hot-load.svg?branch=master)](https://travis-ci.com/lifeart/ember-ast-hot-load) [![Greenkeeper badge](https://badges.greenkeeper.io/lifeart/ember-ast-hot-load.svg)](https://greenkeeper.io/)
==============================================================================

### Any ember components hot-reloading

Main Idea of this addon - ability to reload changed components without application reloading.

This addon is continuation of the project [ember-cli-hot-loader](https://github.com/adopted-ember-addons/ember-cli-hot-loader) and  includes part of it's codebase.

Many thanks to [Toran Billups / @toranb](https://github.com/toranb) for this huge work, support and inspiration!

* `ember-cli-hot-loader` implemented using middleware for  `ember-resolver` and `wrapping` components. 
* `ember-as-hot-load` implemented using compile-time templates `ast` transformations.

| Point  		      | ember-ast-hot-load | ember-cli-hot-loader |
| ------------------  | ------------------ | -------------------- |
| Tagless components   |          +         |           +/-        |
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


## How to use this addon

After the ember install simply run `ember serve` as you normally would. Any changes to component JS/HBS files will result in a hot reload (not a full page reload). If you alter a route, service, controller or controller template ember-cli will do a full page reload.

Helpers looks like components, but we don't support component-like helpers hot-reload.
So, you need to exclude helpers from hot-loader pipeline.

If you don't specify `helpers` in config addon will continue to work, but with `helper` -> `dynamic component` -> `helper` wrapper (you can check it in `ember-inspector` components tab, wrapper will have name like `helper "you-app-helper-name"`).

Let's copy all applications' hot-reload confusing helpers. 
```js
var componentLikeHelpers = Object.keys(require.entries)
    .filter(name=>(name.includes('/helpers/')|| name.includes('/helper')))
    .filter(name=>!name.includes('/-')).map(name=>{
        let path = name.split('/helpers/');
        return path.pop();
    }).filter(name=>!name.includes('/')).uniq();
	
copy(JSON.stringify(componentLikeHelpers))
```

in `ember-cli-build.js` you need to specify this helpers

```js
new EmberApp(defaults, {
  'ember-ast-hot-load': {
    helpers: ["foo-bar", "liquid-if", ... ],
    enabled: true
  }
});

```


## Known Compatibility Workarounds

#### Content Security Policy

There is a known issue when used in conjunction with [ember-cli-content-security-policy](https://github.com/rwjblue/ember-cli-content-security-policy) or any strong [Content Security Policy](https://content-security-policy.com/) that blocks `"unsafe-eval"` (as it should).

When this plugin tries to execute the `Ember.HTMLBars.compile` function, a CSP (Content Security Policy) that does not allow `"unsafe-eval"` will block the JS execution with the following error:

```
Uncaught EvalError: Refused to evaluate a string as JavaScript
because 'unsafe-eval' is not an allowed source of script in the
following Content Security Policy directive: "script-src ...
```

To workaround this issue, in the `config/environment.js` file, add `"unsafe-eval"` to the Development and Test environment sections. Do NOT just add `"unsafe-eval"` to the CSP that goes to Production as this will defeat one of the main safeguards that comes from using a CSP. Here is sample code to add to the CSP in the proper environments only:

```
  // config/environment.js
  ENV.contentSecurityPolicy = {
    // normal CSP for Production here
  }

  if (environment === 'development') {
    // ...
    // Allow unsafe eval on dev environment
    ENV.contentSecurityPolicy['script-src'].push("'unsafe-eval'");
  }

  if (environment === 'test') {
    // ...
    // Allow unsafe eval on test environment
    ENV.contentSecurityPolicy['script-src'].push("'unsafe-eval'");
  }
```

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
