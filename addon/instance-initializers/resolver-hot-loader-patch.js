export function initialize(application) {
  if (typeof window !== 'object') {
    return;
  }

  const service = application.lookup('service:hot-loader');
  const optionsRegex = new RegExp('template-options:main-(.*)');
  const compilerRegex = new RegExp('template-compiler:main-(.*)');

  function captureTemplateOptions(parsedName) {
    if (!service) {
      return;
    }
    if (
      service.get('templateCompilerKey') ||
      service.get('templateOptionsKey')
    ) {
      return;
    }
    var name = parsedName.fullName || '';
    var optionsMatch = name.match(optionsRegex);
    if (optionsMatch && optionsMatch.length > 0) {
      if (service.__isAlive()) {
        service.set('templateOptionsKey', name);
      }
    }
    var compilerMatch = name.match(compilerRegex);
    if (compilerMatch && compilerMatch.length > 0) {
      if (service.__isAlive()) {
        service.set('templateCompilerKey', name);
      }
    }
  }

  application.base.__registry__.resolver.reopen({
    resolveOther(parsedName) {
      captureTemplateOptions(parsedName);
      return this._super(...arguments);
    },
  });
}

export default {
  initialize,
  name: 'resolver-hot-loader-patch',
};
