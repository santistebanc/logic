import {
  isBool,
  sortBy,
  typeObj,
  uniqueTypeObj,
  combs,
  intToChar,
} from "./utils.js";

const comparisons = {
  eq: { func: (a, b) => a === b, sign: "=", neg: "neq" },
  neq: { func: (a, b) => a !== b, sign: "≠", neg: "eq" },
  lt: { func: (a, b) => a < b, sign: "<", neg: "gte" },
  gt: { func: (a, b) => a > b, sign: ">", neg: "lte" },
  lte: { func: (a, b) => a <= b, sign: "≤", neg: "gt" },
  gte: { func: (a, b) => a >= b, sign: "≥", neg: "lt" },
};

const sortRefs = (...args) => {
  const refs = sortBy(args.filter(isRef), isRef);
  const other = args.filter((a) => !isRef(a));
  return [...refs, ...other];
};

const [createRef, isRef] = typeObj("ref");
export const ref = (label) => createRef({ label });

const [createCompare, isCompare] = uniqueTypeObj("compare");
const compare = (id, ...args) => {
  if (["eq", "gte", "lte"].includes(id) && args[0] === args[1]) return true;
  if (["neq", "gt", "lt"].includes(id) && args[0] === args[1]) return false;
  if (!isRef(args[0]) && !isRef(args[1])) return comparisons[id].func(...args);

  const sorted = sortRefs(...args);
  const idFixed =
    args[0] === sorted[1] && args[1] === sorted[0] ? comparisons[id].neg : id;
  return createCompare([idFixed, ...args], {
    id: idFixed,
    args: sorted,
  });
};

const neg = (c) => compare(comparisons[c.id].neg, ...c.args);

const [createBranch, isBranch] = uniqueTypeObj("branch");
const branch = (...compares) => {
  if (compares.includes(false)) return false;
  const filtered = compares.filter((c) => c !== true);
  return createBranch(sortBy(filtered, isBranch), filtered);
};

const [createCond, isCond] = uniqueTypeObj("cond");
const cond = (...branches) => {
  if (branches.includes(true)) return true;
  const filtered = branches.filter((c) => c !== false);
  return createCond(sortBy(filtered, isBranch), filtered);
};

const [createStatement, isStatement] = uniqueTypeObj("statement");
const statement = (value, cond) =>
  createStatement([value, cond], {
    value,
    cond,
  });

const [createOutput, isOutput] = uniqueTypeObj("output");
const output = (...statements) =>
  createOutput(sortBy(statements, isStatement), statements);

const [createComp, isComp] = typeObj("comp");
const comp = (props) => createComp(props);

export const desc = (obj) => {
  if (isOutput(obj)) return obj.map((s) => desc(s)).join("\n\n");
  if (isStatement(obj))
    return obj.cond
      .map((b, i) => desc(b) + (i === 0 ? ` -> ${obj.value}` : ""))
      .join("\n");
  if (isCond(obj)) return obj.map((b) => desc(b)).join("\n");
  if (isBranch(obj)) return "[" + obj.map((c) => desc(c)).join(", ") + "]";
  if (isCompare(obj))
    return `${desc(obj.args[0])} ${comparisons[obj.id].sign} ${desc(
      obj.args[1]
    )}`;
  if (isRef(obj)) return obj.label ?? intToChar(isRef(obj) - 1);
  return obj;
};

export const and = (...args) => {
  if (args.some((a) => !isBool(a) && !isCond(a)))
    throw "type of argument is invalid";
  if (args.includes(false)) return false;
  const fargs = args.filter((a) => a !== true);
  return cond(...combs(...fargs).map((branches) => branch(...branches.flat())));
};

export const or = (...args) => {
  if (args.some((a) => !isBool(a) && !isCond(a)))
    throw "type of argument is invalid";
  if (args.includes(true)) return true;
  const fargs = args.filter((a) => a !== false);
  return cond(...fargs.flat());
};

export const not = (a) => {
  if (!isBool(a) && !isCond(a)) throw "type of argument is invalid";
  if (isBool(a)) return !a;
  return cond(...combs(...a).map((compares) => branch(...compares.map(neg))));
};

export const iff = (...args) => {
  const split = Math.floor(args.length / 2);
  const sts = args.slice(0, split);
  if (sts.some((a) => !isBool(a) && !isCond(a)))
    throw "type of argument is invalid";
  const outs = args.slice(split);
  const results = [];
  sts.reduce((cond, st, i) => {
    results.push(statement(outs[i], and(cond, st)));
    if (i === sts.length - 1) {
      results.push(statement(outs[i + 1], and(cond, not(st))));
    } else {
      return and(cond, not(st));
    }
  }, true);
  return output(...results);
};

export const eq = (a, b) => {
  if (a === b) return true;
  if (isOutput(a) || isOutput(b)) {
  } else return cond(branch(compare("eq", a, b)));
};
export const neq = (a, b) => cond(branch(compare("neq", a, b)));
export const gt = (a, b) => cond(branch(compare("gt", a, b)));
export const lt = (a, b) => cond(branch(compare("lt", a, b)));
export const gte = (a, b) => cond(branch(compare("gte", a, b)));
export const lte = (a, b) => cond(branch(compare("lte", a, b)));
