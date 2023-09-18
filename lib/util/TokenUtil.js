import { is } from "./ModelUtil";

export function findAllProcessSnapshots(root) {
  return root.children.filter((child) => is(child, "bt:ProcessSnapshot"));
}

export function isToken(child) {
  return is(child, "bt:Token");
}

export function findAllTokens(root) {
  if (is(root, "bpmn:Process")) {
    return root.children.filter((child) => isToken(child));
  }
  return root.children
    .filter((child) => is(child, "bpmn:Participant"))
    .flatMap((child) => child.children)
    .filter((child) => isToken(child));
}
export function isLinkedToSnapshot(token, snapshot) {
  return (
    token.businessObject.processSnapshot &&
    token.businessObject.processSnapshot.id === snapshot.id
  );
}
