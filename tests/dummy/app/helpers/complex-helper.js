import { helper } from '@ember/component/helper';

export function complexHelper(params = [], hash = {}) {
  return JSON.stringify({
    params,
    hash
  });
}

export default helper(complexHelper);
