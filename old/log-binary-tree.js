/**
 * Recursively print a binary tree data structure
 * @param {function} printFn            function used to print output; called with a single string argument
 * @param {object} node                 current node object
 * @param {string|function} leftKey     name of current node's left child property, or a function that accepts the
 *                                        current node and returns the left child node
 * @param {string|function} rightKey    name of current node's right child property, or a function that accepts the
 *                                        current node and returns the right child node
 * @param {string|function} displayKey  property to display, or a function that returns a display string
 * @param {string} [indent='']          current indentation string; mostly used to build up indentation across levels
 *                                        of recursion, but may be used to provide a prefix for all printed lines
 */
export default function printNode(
  printFn,
  node,
  leftKey,
  rightKey,
  displayKey,
  indent = ""
) {
  // current item's indentation prefix
  const prefix = indent;

  const leftChild =
      leftKey.constructor === Function ? leftKey(node) : node[leftKey],
    rightChild =
      rightKey.constructor === Function ? rightKey(node) : node[rightKey];

  const displayStr =
    displayKey.constructor === Function ? displayKey(node) : node[displayKey];
  printFn(prefix + " " + displayStr);

  // recurse left
  if (leftChild !== undefined)
    printNode(
      printFn,
      leftChild,
      leftKey,
      rightKey,
      displayKey,
      indent + (!!rightChild ? " |" : "  ")
    );
  // recurse right
  if (rightChild !== undefined)
    printNode(
      printFn,
      rightChild,
      leftKey,
      rightKey,
      displayKey,
      indent + "  "
    );
}
