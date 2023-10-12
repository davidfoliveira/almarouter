function deepEquals(object1, object2) {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);
  if (keys1.length !== keys2.length) {
    return false;
  }
  for (const key of keys1) {
    const val1 = object1[key];
    const val2 = object2[key];
    const areObjects = isObject(val1) && isObject(val2);
    if (
      areObjects && !deepEqual(val1, val2) ||
      !areObjects && val1 !== val2
    ) {
      return false;
    }
  }
  return true;
}

function objectMatches(obj1, obj2) {
  let has = true;
  Object.keys(obj2).forEach((k) => {
    if (!deepEquals(obj1[k], obj2[k])) has = false;
  });
  return has;
}

function isObject(object) {
  return object != null && typeof object === 'object';
}

module.exports = {
  deepEquals,
  objectMatches,
  isObject,
};
