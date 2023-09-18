/**
 * Find all process snapshots using the root element.
 *
 * @param  root
 *
 * @return
 */
export function findAllProcessSnapshots(
  root: Element | ModdleElement,
): Element[];

/**
 * Return true if the element has the token type.
 *
 * @param element
 *
 * @return
 */
export function isToken(element: Element | ModdleElement): boolean;

/**
 * Find all tokens using the root element.
 *
 * @param root
 *
 * @return
 */
export function findAllTokens(root: Element | ModdleElement): Element[];

/**
 * Return true if the token is linked to the given snapshot.
 *
 * @param token
 * @param snapshot
 *
 * @return
 */
export function isLinkedToSnapshot(
  token: Element | ModdleElement,
  snapshot: Element | ModdleElement,
): boolean;

type Element = import("../model/Types").Element;
type ModdleElement = import("../model/Types").ModdleElement;
