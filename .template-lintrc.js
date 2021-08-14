'use strict';

module.exports = {
  extends: 'recommended',
  rules: {
    'no-curly-component-invocation': {
      allow: [
        'dynamic-component-t',
        'textarea',
        'input',
        'bs-nested',
        'arg-wrapper',
        'template-only',
        'x-test-wrapper-internal',
        'test-component',
        'x-test-wrapper',
        'name-wrapper',
        'test-component',
        'foo-bar',
      ],
    },
    'no-unnecessary-component-helper': false,
    'no-implicit-this': {
      allow: [
        'foo-bar',
        'test-component',
        'template-only',
        'x-test-wrapper',
        'name-wrapper',
        'dynamic-component-t',
      ],
    },
  },
};
