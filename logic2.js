import {
  typeObj,
  uniqueTypeObj,
  s,
  intersect,
  noReps,
  combs,
  isBool,
} from "./utils.js";

const valkey = Symbol("value");

const [createRef, isRef] = typeObj("ref");
export const ref = (label) =>
  createRef({ label, [Symbol.toPrimitive]: () => label });

const [createDomain, isDomain] = uniqueTypeObj("domain");
const domain = (ref, min, max, ...holes) =>
  createDomain([ref, min, max, ...holes], { ref, min, max, holes });

const [createCond, isCond] = uniqueTypeObj("cond");
const cond = (domains = [], order = [], equals = [], unequals = []) => {
  const keys = [
    s(...domains),
    s(...order.map((i) => l(...i))),
    s(...equals.map((i) => l(...i))),
    s(...unequals.map((i) => l(...i))),
  ];
  return createCond(keys, {
    domains: Object.fromEntries(keys[0].map((d) => [d.ref, d])),
    order: keys[1],
    equals: keys[2],
    unequals: keys[3],
  });
};

const [createOutcome, isOutcome] = uniqueTypeObj("outcome");
const outcome = (cond, val) =>
  createOutcome([cond, val], {
    cond,
    val,
  });

const [createProp, isProp] = uniqueTypeObj("prop");
const prop = (key, ...outcomes) =>
  createProp([key, s(...outcomes)], {
    [key]: s(...outcomes),
  });

const [createInvalid, isInvalid] = uniqueTypeObj("invalid");
const invalid = (key) => createInvalid([key], { key });

export const gt = (...args) => {
  const bothRefs = args.every(isRef);
  if (bothRefs) {
    return prop(valkey, outcome(cond([], [[...args].reverse()]), true));
  } else {
    const [r, c] = args;
    return prop(
      valkey,
      outcome(cond([domain(r, c, Infinity, c)]), true),
      outcome(cond([domain(r, -Infinity, c)]), false)
    );
  }
};

export const gte = (...args) => {
  const bothRefs = args.every(isRef);
  if (bothRefs) {
    return prop(
      valkey,
      outcome(cond([], [[...args].reverse()]), true),
      outcome(cond([], [], [[args]]), true)
    );
  } else {
    const [r, c] = args;
    return prop(
      valkey,
      outcome(cond([domain(r, c, Infinity)]), true),
      outcome(cond([domain(r, -Infinity, c, c)]), false)
    );
  }
};

export const lt = (...args) => {
  const bothRefs = args.every(isRef);
  if (bothRefs) {
    return prop(valkey, outcome(cond([], [args]), true));
  } else {
    const [r, c] = args;
    return prop(
      valkey,
      outcome(cond([domain(r, -Infinity, c, c)]), true),
      outcome(cond([domain(r, c, Infinity)]), false)
    );
  }
};

export const lte = (...args) => {
  const bothRefs = args.every(isRef);
  if (bothRefs) {
    return prop(
      valkey,
      outcome(cond([], [args]), true),
      outcome(cond([], [], [args]), true)
    );
  } else {
    const [r, c] = args;
    return prop(
      valkey,
      outcome(cond([domain(r, -Infinity, c)]), true),
      outcome(cond([domain(r, c, Infinity, c)]), false)
    );
  }
};

export const eq = (...args) => {
  const bothRefs = args.every(isRef);
  if (bothRefs) {
    return prop(valkey, outcome(cond([], [], [args]), true));
  } else {
    const [r, c] = args;
    return prop(
      valkey,
      outcome(cond([domain(r, c, c)]), true),
      outcome(cond([domain(r, c, c, c)]), false)
    );
  }
};

export const neq = (...args) => {
  const bothRefs = args.every(isRef);
  if (bothRefs) {
    return prop(valkey, outcome(cond([], [], [], [args]), true));
  } else {
    const [r, c] = args;
    return prop(
      valkey,
      outcome(cond([domain(r, c, c, c)]), true),
      outcome(cond([domain(r, c, c)]), false)
    );
  }
};

const and = (a, b) => {
  if (!a[valkey] || !a[valkey]) return invalid("NotBoolOutcome");
  return prop(
    valkey,
    ...combs(a[valkey], b[valkey]).flatMap(([ao, bo]) => {
      const andc = andConds(ao.cond, bo.cond);
      const isValid = isBool(ao.val) && isBool(bo.val);
      if (!andc) return [];
      return andc.map((c) =>
        outcome(c, isValid ? ao.val && bo.val : invalid("NotBoolOutcome"))
      );
    })
  );
};

const andConds = (a, b) => {
  if (a === false || b === false) return false;
  if (a === true) return b;
  if (b === true) return a;
  const {
    uniqueInA: uniqueInARefs,
    common: commonRefs,
    uniqueInB: uniqueInBRefs,
  } = intersect(Object.keys(a.domains), Object.keys(b.domains));

  const orderArray = noReps(...a.order, ...b.order);

  const commonDomains = commonRefs.map((r) => {
    const da = a.domains[r];
    const db = b.domains[r];
    if (da.max < db.min || db.max < da.min) return false;
    const min = Math.max(da.min, db.min);
    const max = Math.min(da.max, db.max);
    if (min > max) return false;
    return domain(
      r,
      min,
      max,
      ...noReps(
        ...da.holes.filter((h) => h <= max && h >= min),
        ...db.holes.filter((h) => h <= max && h >= min)
      )
    );
  });

  if (commonDomains.includes(false)) return false;
  return [
    cond(
      [
        ...uniqueInARefs.map((r) => a.domains[r]),
        ...commonDomains,
        ...uniqueInBRefs.map((r) => b.domains[r]),
      ],
      orderArray
    ),
  ];
};

//TODO: orConds

const desc = (x) => {
  if (isRef(x)) return x.label;
  if (isDomain(x))
    return `${desc(x.min)} ${x.holes.includes(x.min) ? "<" : "≤"} ${desc(
      x.ref
    )} ${x.holes.includes(x.max) ? "<" : "≤"} ${desc(x.max)}`;
  if (isCond(x))
    return Object.values(x.domains)
      .map((d) => `[${desc(d)}]`)
      .join(" ");
  if (isOutcome(x)) return `${desc(x.cond)} -> ${desc(x.val)}`;
  if (isProp(x))
    return x[valkey]
      ? `::\n${x[valkey].map((o) => desc(o)).join("\n")}`
      : Object.entries(x)
          .map(([k, v]) => `${k}:\n${desc(v)}`)
          .join("\n\n");
  if (x === Infinity) return "Inf";
  if (x === -Infinity) return "-Inf";
  return x;
};

//test

const a = ref("a");
const b = ref("b");

const app = and(and(gt(a, 5), lt(a, 8)), gt(a, 7));

console.log(desc(app));

// gt(a, 2) lt(b, 4) neq(a, b)

// gt(a, 2) lt(a, 4)
// gt(b, 2) lt(b, 4)
// gt(a, 2) lt(b, 4) gt(a, b)
