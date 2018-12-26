import { dasherize } from "@ember/string";
import { looksLikeRouteTemplate } from "ember-ast-hot-load/utils/matchers";

export default function normalizers() {
  return true;
}

export function componentNameFromClassName(name) {
  return normalizeComponentName(name)
  .replace('-component', '')
  .replace('-class','');
}

export function dasherizePath(str = "") {
  return str
    .split("/")
    .map(dasherize)
    .join("/")
    .trim();
}

export function normalizePath(path) {
  return dasherizePath(path.split("\\").join("/"));
}

// we need this because Ember.String.dasherize('XTestWrapper') -> xtest-wrapper, not x-test-wrapper
export function dasherizeName(name = '') {
	const result = [];
	const nameSize = name.length;
	if (!nameSize) {
		return '';
	}
	result.push(name.charAt(0));
	for (let i = 1; i < nameSize; i++) {
		let char = name.charAt(i);
		if (char === char.toUpperCase()) {
			if (char !== '-' && char !== '/' && char !== '_') {
				if (result[result.length - 1] !== '-' && result[result.length - 1] !== '/') {
					result.push('-');
				}
			}
		}
		result.push(char);
	}
	return result.join('');
}

export function normalizeComponentName(name) {
  if (typeof name !== 'string') {
    return name;
  } else {
    return dasherizeName(name).toLowerCase();
  }
}

export function getPossibleRouteTemplateMeta(maybeString = '') {
  const rawPath = String(maybeString || '');
  const path = normalizePath(rawPath).split('/').join('.').replace('.hbs', '');
  const MU_PATH = '.src.ui';
  // pods don't supported this time
  const relativeAppEntrypoint = path.includes(MU_PATH) ? MU_PATH : '.app.';
  const maybePodsPath = path.endsWith('.template');
  const paths = path.split(relativeAppEntrypoint);
  paths.shift();
  const maybeRouteName = paths.join(relativeAppEntrypoint);
  const maybeClassicPath =  maybeRouteName.startsWith('templates.');
  const possibleRouteName = maybeRouteName.replace('templates.', '').replace('routes.','');

  return {
    looksLikeRouteTemplate: looksLikeRouteTemplate(normalizePath(rawPath)),
    possibleRouteName,
    possibleTemplateName: possibleRouteName.split('.').join('/'),
    maybeClassicPath,
    maybePodsPath,
    isMU: relativeAppEntrypoint === MU_PATH
  }
}