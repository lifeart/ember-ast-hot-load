ember-ast-hot-load
==============================================================================

Main Idea of this addon - ad-hock components transformation.

[glimmer hot-reload test #1](https://github.com/emberjs/ember.js/blob/master/packages/%40ember/-internals/glimmer/tests/integration/application/hot-reload-test.js)


[glimmer hot-reload test #2](https://github.com/emberjs/ember.js/blob/master/packages/%40ember/-internals/glimmer/tests/integration/application/hot-reload-test.js#L106
)

https://github.com/adopted-ember-addons/ember-cli-hot-loader

refs [astexporer](https://astexplorer.net/#/gist/9cdbd763be462d0b76ed6f442f62d5fe/b84f902de115f4cc32d43b9b4d9170067ed391b3)


```hbs
{{component 'foo-bar' a="1"}}
{{component (mut 1 2 3) b c d e="f"}}
{{foo-bar
  baz="stuff"
}}
{{#foo-boo}}
dsfsd
{{/foo-boo}}
{{doo-bar 1 2 3 hoo-boo name=(goo-boo "foo")}}
{{component (hot-load "foo-bar") baz="stuff"}}
{{test-component}}
{{test-component}}
{{test-component}}
```

will be transformed to 


```hbs
{{component (hot-load "foo-bar") a="1"}}
{{component (hot-load (mut 1 2 3)) b c d e="f"}}
{{component (hot-load "foo-bar") baz="stuff"}}
{{#component (hot-load "foo-boo")}}dsfsd
{{/component}}{{component (hot-load "doo-bar") 1 2 3 hoo-boo name=(goo-boo "foo")}}
{{component (hot-load "foo-bar") baz="stuff"}}
{{component (hot-load "test-component")}}
{{component (hot-load "test-component")}}
{{component (hot-load "test-component")}}
```

and `hot-load` helper will manage component reloading

Installation
------------------------------------------------------------------------------

```
ember install ember-ast-hot-load
```


Usage
------------------------------------------------------------------------------


Helpers looks like components, but we don't support component-like helpers hot-reload.
So, you need to exclude helpers from hot-loader pipeline.


Let's copy all applcation's hot-reload confusing helpers. 
```js
var componentLikeHelpers = Object.keys(require.entries)
	.filter(name=>(name.includes('/helpers/')|| name.includes('/helper')))
	.filter(name=>!name.includes('/-')).map(name=>{
		let path = name.split('/helpers/');
		return path.pop();
	}).filter(name=>!name.includes('/')).filter(name=>name.includes('-'));
	
copy(JSON.stringify(componentLikeHelpers))
```

in `ember-cli-build.js` you need to specify this helpers

```js
new EmberApp(defaults, {
  'ember-ast-hot-load': {
    helpers: ["foo-bar", "liquid-if", ... ]
  }
});

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
