import { normalizePath, dasherizePath } from "ember-ast-hot-load/utils/normalizers";

export default function matchers() {
  return true;
}

export function hasValidHelperName(name) {
  if (name.includes('@') || name.includes('/') || name.includes('.')) {
    return false;
  } else {
    return true;
  }
}

export function isValidComponentExtension(path = '') {
  return path.endsWith(".ts") || path.endsWith(".hbs") || path.endsWith(".js");
}

export function matchingComponent(rawComponentName, path) {
  if (typeof path !== "string") {
    return false;
  }
  if (typeof rawComponentName !== "string") {
    return false;
  }
  if (!isValidComponentExtension(path)) {
    return false;
  }
  let componentName = dasherizePath(rawComponentName);
  let normalizedPath = normalizePath(path);
  let possibleExtensions = [
    ".ts",
    ".js",
    ".hbs",
    "/component.ts",
    "/index.js",
    "/index.ts",
    "/index.hbs",
    "/component.js",
    "/template.hbs"
  ];
  let possibleEndings = possibleExtensions.map(ext => componentName + ext);

  const classicIgnores = ['app/controllers/','app/helpers/','app/services/','app/utils/', 'app/adapters/', 'app/models/', 'app/routes/'];
  let result = possibleEndings.filter((name) => {
    return normalizedPath.endsWith('/' + name) && classicIgnores.filter((substr) => normalizedPath.includes(substr)).length === 0;
  }).length;

  return result;
}

const stringEscapeRegExp = /[.*+?^${}()|[\]\\]/g;
const templateEndRegExp = /template\.hbs$/i;
const windowsSeparatorRegExp = /\\/g;
const regExpCache = {};

function cachePodRegExp(podModulePrefix) {
  regExpCache[podModulePrefix] = regExpCache[podModulePrefix] ||
    new RegExp(`^[\\s\\S]*([/\\\\]${podModulePrefix.replace(stringEscapeRegExp, '\\$&')}[/\\\\])`, 'i')

  return regExpCache[podModulePrefix];
}

export function looksLikeRouteTemplate(path, podModulePrefix = 'pods') {
  // mu app case
  if (path.includes('/src/ui/')) {
    return path.includes('/routes/') && path.endsWith('/template.hbs') && !path.includes('/-components/');
  }

  // Strip pod paths
  const templatePath = normalizePath(path).replace(cachePodRegExp(podModulePrefix), '$1').replace(templateEndRegExp, '');
  const reverseSeparatorPath = templatePath.replace(windowsSeparatorRegExp, '/');

  const hasComponent = Object.keys(window.requirejs ? window.requirejs.entries : {})
    .some(name => name.endsWith(`${templatePath}component`) || name.endsWith(`${reverseSeparatorPath}component`));

  return !path.includes('component') && path.endsWith('.hbs') &&
         !path.endsWith('-loading.hbs') && !path.endsWith('-error.hbs') &&
         !hasComponent;
}


export function getMUScopedComponents() {
  const muComponentsPath = '/ui/components/';
  if (typeof window === 'undefined') {
    return [];
  }
  const pairs = Object.keys(window.requirejs ? window.requirejs.entries : {})
  .filter(name=>(name.includes(muComponentsPath)))
  .map((name)=>{
    const [ , maybeName = false ] = name.split(muComponentsPath);
    if (typeof maybeName === 'string') {
      return maybeName;
    } else {
      return false;
    }
  }).filter((item)=>(item !== false));
  const result = [];
  pairs.forEach((rawComponentRef)=>{
    const isTemplate = rawComponentRef.endsWith('/template');
    const substrToReplace = isTemplate ? '/template' : '/component';
    const normalizedComponentName = rawComponentRef.replace(substrToReplace, '');
    if (!result.includes(normalizedComponentName) && !normalizedComponentName.includes('/-')) {
      result.push(normalizedComponentName);
    }
  });
  return result;
}

export function getRouteScopedComponents() {
  if (typeof window === 'undefined') {
    return [];
  }
  const pairs = Object.keys(window.requirejs ? window.requirejs.entries : {})
    .filter(name=>(name.includes('/-components/')))
    .map((name)=>{
		const [ , maybeName = false ] = name.split('/src/ui/routes/');
		if (typeof maybeName === 'string') {
			return maybeName.split('/-components/');
		} else {
			return false;
		}
	}).filter((item)=>(item !== false));
  const result = {};
  pairs.forEach(([routePath, rawComponentRef])=>{
    const normalizedRoute = routePath.split('/').join('.');
    const isTemplate = rawComponentRef.endsWith('/template');
    const substrToReplace = isTemplate ? '/template' : '/component';
    const normalizedComponentName = rawComponentRef.replace(substrToReplace, '');
    if (!result[normalizedRoute]) {
      result[normalizedRoute] = [];
    }
    if (!result[normalizedRoute].includes(normalizedComponentName) && !normalizedComponentName.includes('/-')) {
      result[normalizedRoute].push(normalizedComponentName);
    }
  });
  return result;
}
