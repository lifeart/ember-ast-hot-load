import { helper } from '@ember/component/helper';

export function fooBar(params/*, hash*/) {
  return params;
}

export default helper(fooBar);
