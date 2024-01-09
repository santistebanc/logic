// inside(a, 3, 4)

// const screenWidth = input((x) => and(isNum(x), lt(x, 5), gt(x, 1)), 0);

// screenWidth.set(2)

const page = ref();
const counter = ref();

const app = {
  [page]: 0,
  [counter]: 0,
  title: iff("Home", "About", "NotFound")(eq(page, 0), eq(page, 1)),
  content: iff(homePage, aboutPage)(eq(page, 0), eq(page, 1)),
  footer: text("done by me"),
};

const column = (...items) => ({
  type: "column",
  items,
});

// const userName = input((val, prev, isInitial) =>
//   iff(
//     and(isString(val), lt(len(val), 10)),
//     and(val, set(userNameInvalid, false)),
//     and(prev, set(userNameInvalid, true))
//   )
// );

const userNameInvalid = ref();

const welcomeUser = effect((un) => console.log("welcome " + un), userName);

// const [onScreenResize, resizeScreen] = ev();

const screenSize = ref();

const colors = iff(
  isDark,
  { primary: "#FF8756", secondary: "#FFac56" },
  { main: "#FF8756" }
);

const homePage = {
  [userName]: "",
  [userNameInvalid]: false,
  [effects]: [welcomeUser],
  ...column(
    text("welcome ", userName),
    button("go to about", set(page, 1)),
    button("inc", set(counter, sum(counter, 1))),
    iff(
      userNameInvalid,
      text("the username is invalid", {
        color: get(colors.primary, colors.main),
      })
    ),
    textInput(userName)
  ),
};

const aboutPage = column(
  text("this is about page"),
  button("inc", set(counter, sum(counter, 1)))
);

renderDOM(app);



false -> {[value]: [{cond: [true], val: false}]}
5 -> {[value]: [{cond: [true], val: 5}]}
a -> {[value]: [{cond: [true], val: a}]}
gt(a,2) -> {[value]: [{cond: [gt(a,2)], val: true}, {cond: [lte(a,2)], val: false}]}
{em: 6} -> {em: {[value]: [{cond: [true], val: 6}]}}
{em: gt(a,2,10)} -> {em: {[value]: [{cond: [gt(a,2)], val: 10}]}}
{em: gt(a,2,{one: 10, two: 20}, 0)} -> {em: {[value]: [{cond: [lte(a,2)], val: 0}], one: {[value]: [{cond: [gt(a,2)], val: 10}]}, two: {[value]: [{cond: [gt(a,2)], val: 20}]}}}




{[value]: {[b(gt(a,2))]: true, [b(lte(a,2))]: false}}


box(false).addBranch()

box(false).addProp('newProp', gt(a, 2, 10, 20))

box(false).newProp.getBranch([gt(a,2)]).val

box(false).setVal(true)
box(false).val

box(false).getConds()
