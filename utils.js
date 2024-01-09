import ManyKeysMap from "many-keys-map";

export const defineProp = (obj, prop, value, other = {}) =>
  Object.defineProperty(obj, prop, { value, enumerable: false, ...other });

const uniqueObjs = new ManyKeysMap();
export const u = (id, val) => {
  const keys = asArray(id);
  if (!uniqueObjs.has(keys, val)) uniqueObjs.set(keys, val);
  return uniqueObjs.get(keys);
};

export const typeObj = (label) => {
  let count = 0;
  const sym = Symbol(label);
  return [(obj = {}) => defineProp(obj, sym, ++count), (obj) => obj?.[sym]];
};

export const uniqueTypeObj = (type) => {
  let count = 0;
  const sym = Symbol(type);
  return [
    (keys, obj = {}) =>
      u([type, ...asArray(keys)], defineProp(obj, sym, ++count)),
    (obj) => obj?.[sym],
  ];
};

export const asArray = (obj) => (Array.isArray(obj) ? obj : [obj]);

// const isArray = (obj) => Array.isArray(obj)
// const isObject = (obj) => obj != null && typeof obj === 'object'
// const isVal = (obj) => obj?.isVal

export const isBool = (obj) => obj === true || obj === false;

export const sortBy = (arr, getIndex) => {
  const res = [...arr];
  res.sort((a, b) => (getIndex(b) || 0) - (getIndex(a) || 0));
  return res;
};

export const combs = (first, ...other) =>
  first === undefined
    ? []
    : other.reduce(
        (a, b) => a.flatMap((ia) => b.map((ib) => [...ia, ib])),
        first.map((f) => [f])
      );

export const intToChar = (i) =>
  (i >= 26 ? intToChar(((i / 26) >> 0) - 1) : "") +
  "abcdefghijklmnopqrstuvwxyz"[i % 26 >> 0];

const [createSet, isSet] = uniqueTypeObj("set");
export const s = (...items) => {
  const noRepItems = noReps(...items);
  return createSet(sortBy(noRepItems, isSet), noRepItems);
};

const [createList, isList] = uniqueTypeObj("list");
export const l = (...items) => createList(items, items);

export const intersect = (a, b) => {
  const uniqueInA = [];
  const common = [];
  const uniqueInB = [...b];
  a.forEach((ia) => {
    if (b.includes(ia)) {
      common.push(ia);
      uniqueInB.splice(uniqueInB.indexOf(ia), 1);
    } else {
      uniqueInA.push(ia);
    }
  });
  return { uniqueInA, common, uniqueInB };
};

export const noReps = (...items) => [...new Set(items)];
