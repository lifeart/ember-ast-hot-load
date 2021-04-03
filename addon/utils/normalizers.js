import { dasherize } from '@ember/string';
import { looksLikeRouteTemplate } from 'ember-ast-hot-load/utils/matchers';

export default function normalizers() {
  return true;
}

export function componentNameFromClassName(name) {
  return normalizeComponentName(name)
    .replace('-component', '')
    .replace('-class', '');
}

export function dasherizePath(str = '') {
  return str.split('/').map(dasherize).join('/').trim();
}

export function normalizePath(path) {
  return dasherizePath(path.split('\\').join('/'));
}

// Take from https://github.com/emberjs/ember.js/blob/b31998b6a0cccd22a8fb6fab21d24e5e7f2cb70d/packages/ember-template-compiler/lib/system/dasherize-component-name.ts
// we need this because Ember.String.dasherize('XTestWrapper') -> xtest-wrapper, not x-test-wrapper
const SIMPLE_DASHERIZE_REGEXP = /[A-Z]|::/g;
const ALPHA = /[A-Za-z0-9]/;
export function dasherizeName(name = '') {
  return name.replace(SIMPLE_DASHERIZE_REGEXP, (char, index) => {
    if (char === '::') {
      return '/';
    }

    if (index === 0 || !ALPHA.test(name[index - 1])) {
      return char.toLowerCase();
    }

    return `-${char.toLowerCase()}`;
  });
}

export function normalizeComponentName(name) {
  if (typeof name !== 'string') {
    return name;
  } else {
    return dasherizeName(name);
  }
}

export function getPossibleRouteTemplateMeta(
  maybeString = '',
  podModulePrefix
) {
  const rawPath = String(maybeString || '');
  const path = normalizePath(rawPath).split('/').join('.').replace('.hbs', '');
  const MU_PATH = '.src.ui';
  // pods don't supported this time
  const relativeAppEntrypoint = path.includes(MU_PATH) ? MU_PATH : '.app.';
  const maybePodsPath = path.endsWith('.template');
  const paths = path.split(relativeAppEntrypoint);
  paths.shift();
  const maybeRouteName = paths.join(relativeAppEntrypoint);
  const maybeClassicPath = maybeRouteName.startsWith('templates.');
  const possibleRouteName = maybeRouteName
    .replace('templates.', '')
    .replace('routes.', '');

  return {
    looksLikeRouteTemplate: looksLikeRouteTemplate(
      normalizePath(rawPath),
      podModulePrefix
    ),
    possibleRouteName,
    possibleTemplateName: possibleRouteName.split('.').join('/'),
    maybeClassicPath,
    maybePodsPath,
    isMU: relativeAppEntrypoint === MU_PATH,
  };
}
