import {
  typeObj,
  uniqueTypeObj,
  s,
  l,
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
    domains: new Map(keys[0].map((d) => [d.ref, d])),
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

const and2 = (a, b) => {
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
const and = (...args) => args.reduce(and2);

const andConds = (a, b) => {
  if (a === false || b === false) return false;
  if (a === true) return b;
  if (b === true) return a;
  const {
    uniqueInA: uniqueInARefs,
    common: commonRefs,
    uniqueInB: uniqueInBRefs,
  } = intersect([...a.domains.keys()], [...b.domains.keys()]);

  const orderArray = noReps(...a.order, ...b.order);

  const commonDomains = commonRefs.map((r) => {
    const da = a.domains.get(r);
    const db = b.domains.get(r);
    if (da.max < db.min || db.max < da.min) return false;
    const min = Math.max(da.min, db.min);
    const max = Math.min(da.max, db.max);
    const holes = noReps(
      ...da.holes.filter((h) => h <= max && h >= min),
      ...db.holes.filter((h) => h <= max && h >= min)
    );
    if (min > max) return false;
    if (min === max && holes.includes(min)) return false;
    return domain(r, min, max, ...holes);
  });

  if (commonDomains.includes(false)) return false;

  const unFixeddomains = [
    ...uniqueInARefs.map((r) => a.domains.get(r)),
    ...commonDomains,
    ...uniqueInBRefs.map((r) => b.domains.get(r)),
  ];

  const refMinMax = new Map(
    unFixeddomains.map(({ ref, min, max, holes }) => [ref, { min, max, holes }])
  );

  if (
    orderArray.some((it) =>
      it.slice(0, -1).some((r1, i) => {
        const r2 = it[i + 1];
        const r1m = refMinMax.get(r1);
        const r2m = refMinMax.get(r2);

        r1m.max = Math.min(r2m.max, r1m.max);
        if (r1m.max === r2m.max) r1m.holes = noReps(...r1m.holes, r1m.max);

        r2m.min = Math.max(r2m.min, r1m.min);
        if (r2m.min === r1m.min) r2m.holes = noReps(...r2m.holes, r2m.min);

        return (
          r1m.max < r1m.min ||
          r2m.max < r2m.min ||
          (r1m.min === r1m.max && r1m.holes.includes(r1m.min)) ||
          (r2m.min === r2m.max && r2m.holes.includes(r2m.min))
        );
      })
    )
  )
    return false;

  const domains = unFixeddomains.map((d) => {
    const { min, max, holes } = refMinMax.get(d.ref);
    return domain(
      d.ref,
      min,
      max,
      ...holes.filter((h) => h <= max && h >= min)
    );
  });

  return [cond(domains, orderArray)];
};

//TODO: orConds

const desc = (x) => {
  if (isRef(x)) return x.label;
  if (isDomain(x))
    return `${desc(x.min)} ${x.holes.includes(x.min) ? "<" : "≤"} ${desc(
      x.ref
    )} ${x.holes.includes(x.max) ? "<" : "≤"} ${desc(x.max)}`;
  if (isCond(x))
    return [
      [...x.domains.values()].map((d) => `[${desc(d)}]`).join(" "),
      x.order
        .map(
          (it) =>
            "[" +
            it
              .map((r, i) => desc(r) + (i < it.length - 1 ? " < " : ""))
              .join("") +
            "]"
        )
        .join(" "),
    ].join(" ");
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

//manual test

const a = ref("a");
const b = ref("b");

const app = and(gt(a, 10), lt(a, 10), lt(b, 1));

console.log(desc(app), "\n\n");

//automated tests

console.assert(
  and(gt(a, 1), gt(a, 5))
    [valkey].find((o) => o.val === true)
    .cond.domains.get(a).min === 5,
  "test min"
);

console.assert(
  and(lt(a, 1), lt(a, 5))
    [valkey].find((o) => o.val === true)
    .cond.domains.get(a).max === 1,
  "test max"
);
