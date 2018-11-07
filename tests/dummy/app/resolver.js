import Resolver from 'ember-resolver';

window.templateOptionsKey = null;
window.templateCompilerKey = null;

var optionsRegex = new RegExp('template-options:main-(.*)');
var compilerRegex = new RegExp('template-compiler:main-(.*)');

function captureTemplateOptions(parsedName) {
	if (window.templateCompilerKey || window.templateOptionsKey) {
     return;
	}
	var name = parsedName.fullName || '';
	var optionsMatch = name.match(optionsRegex);
	if (optionsMatch && optionsMatch.length > 0) {
		window.templateOptionsKey = name;
	}
	var compilerMatch = name.match(compilerRegex);
	if (compilerMatch && compilerMatch.length > 0) {
		window.templateCompilerKey = name;
	}
  }

export default Resolver.extend({
	resolveOther(parsedName) {
		captureTemplateOptions(parsedName);
		return this._super(...arguments);
	}
})
