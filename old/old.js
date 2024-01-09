import printNode from "./log-binary-tree.js";
import { isBool, typeObj, u } from "../utils.js";

const [createRef, isRef] = typeObj("ref");
const ref = (name) => createRef({ name });

const A = ref("A");
const B = ref("B");

const refsOrder = [];
const sortRefs = (...elems) => {
  const refs = [];
  const other = [];
  elems.forEach((r) => {
    if (isRef(r)) {
      if (!refsOrder.includes(r)) refsOrder.push(r);
      refs.push(r);
    } else {
      other.push(r);
    }
  });
  refs.sort((a, b) => refsOrder.indexOf(b) - refsOrder.indexOf(a));
  return [...refs, ...other];
};

const [treeType, isTree] = typeObj("tree");
const tree = (comp, onTrue, onFalse) => {
  return u(
    ["tree", comp, onTrue, onFalse],
    treeType({ comp, onTrue, onFalse })
  );
};

const traverse = (t, sub) =>
  tree(
    t.comp,
    isTree(t.onTrue) ? traverse(t.onTrue, sub) : sub ? sub(t.onTrue) : t.onTrue,
    isTree(t.onFalse)
      ? traverse(t.onFalse, sub)
      : sub
      ? sub(t.onFalse)
      : t.onFalse
  );

const [errorType, isError] = typeObj("error");
const outputTypeError = (error) => errorType({ error });

const mustBeBool = (v) => {
  console.log("vvvv", v);
  return !isBool(v) && !isTree(v) && !isError(v)
    ? outputTypeError(`${v} must be of type boolean`)
    : v;
};

const and = (t1, t2) => traverse(t1, (v) => (v === true ? t2 : mustBeBool(v)));

const or = (t1, t2) => traverse(t1, (v) => (v === false ? t2 : mustBeBool(v)));

const not = (t1) =>
  traverse(t1, (v) =>
    v === false ? true : v === true ? false : mustBeBool(v)
  );

const iff = (cond, tt, tf) =>
  traverse(cond, (v) => (v === true ? tt : v === false ? tf : mustBeBool(v)));

const [funcType, isFunc] = typeObj("tree");
const comp = (id, sym, ev) => {
  const func = (a, b, t = true, f = false) => {
    const keys = sortRefs(a, b);
    if (!isRef(a) && !isRef(b)) {
      return gt.eval(a, b) ? t : f;
    }
    const c = u(
      [id, ...keys],
      funcType({
        id,
        func,
        a,
        b,
        ev,
        desc: `${desc(a)} ${sym} ${desc(b)}`,
        bothRefs: isRef(a) && isRef(b),
      })
    );

    return tree(c, t, f);
  };
  return func;
};

const gt = comp("gt", ">", (a, b) => a > b);
const gte = comp("gte", ">=", (a, b) => a >= b);
const lt = comp("lt", "<", (a, b) => a < b);
const lte = comp("lte", "<=", (a, b) => a <= b);

const desc = (o) => (isRef(o) ? o.name : isFunc(o) ? o.desc : o);

const app = iff(
  and(lt(A, 100), or(gt(B, 2), and(gt(A, 1), lt(B, 10)))),
  10,
  false
);

const print = (a) =>
  printNode(
    console.log,
    a,
    (n) => n.onTrue,
    (n) => n.onFalse,
    (n) => (isFunc(n?.comp) ? desc(n.comp) : isError(n) ? "Error" : n)
  );

// print(app);

print(and(gt(A, 1), app));
