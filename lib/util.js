/*
 * Time-related util functions
 */

let nextIntervalId = 1;
const INTERVALS = { };

// A "setInterval" that doesn't overflow the stack in case it starts taking longer
function every(interval, fn) {
  const intervalId = nextIntervalId;
  INTERVALS[intervalId] = { };
  let running = false;
  const intervalFn = async () => {
    if (running) return;
    running = true;
    await fn();
    running = false;
    INTERVALS[intervalId].timeout = setTimeout(intervalFn, interval);
  };
  INTERVALS[intervalId].timeout = setTimeout(intervalFn, interval);
  nextIntervalId++;
  return intervalId;
}

function cancelInterval(intervalId) {
  const interval = INTERVALS[intervalId];
  if (!interval) return false;
  if (interval.timeout != null) clearTimeout(interval.timeout);
  delete INTERVALS[intervalId];
  return true;
}

async function sleep(timeInMs) {
  return new Promise((res) => setTimeout(res, timeInMs));
}


/*
 * Object related util functions
 */

function deepEquals(object1, object2) {
  if (typeof object1 !== typeof object2) {
    return false;
  }

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
  every,
  cancelInterval,
  sleep,
};
