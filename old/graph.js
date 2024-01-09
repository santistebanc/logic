import { typeObj } from "../utils";

export const [nodeObj, isNode] = typeObj("isNode");

const edges = new Map();

const setEdge = (n1, n2, edgeName, props = {}) => {
  if (!isNode(n1)) throw "n1 has to be a node";
  const edge = { from: n1, to: n2, edgeName, props };
  n1[edgeName] = n2;
  edges.set(n1, edge);
  if (isNode(n2)) edges.set(n2, edge);
};

export const n = (props = {}) => {
  const node = nodeObj();
  Object.entries(props).forEach(([key, val]) => setEdge(node, val, key));
  return node;
};
