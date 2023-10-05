import { every } from "min-dash";

import inherits from "inherits-browser";

import { isAny, is } from "../../util/ModelUtil";

import { isLabel } from "../../util/LabelUtil";

import RuleProvider from "diagram-js/lib/features/rules/RuleProvider";

import { isConnection } from "diagram-js/lib/util/ModelUtil";

/**
 * @typedef {import("diagram-js/lib/core/EventBus").default} EventBus
 *
 * @typedef {import("../../model/Types").Connection} Connection
 * @typedef {import("../../model/Types").Element} Element
 * @typedef {import("../../model/Types").Shape} Shape
 * @typedef {import("../../model/Types").ModdleElement} ModdleElement
 *
 * @typedef {import("diagram-js/lib/util/Types").Point} Point
 * @typedef {import("diagram-js/lib/util/Types").Rect} Rect
 *
 * @typedef { {
 *   associationDirection?: string;
 *   type: string;
 * } | boolean | null } CanConnectResult
 *
 * @typedef { {
 *   id: string;
 *   type: string;
 * } | boolean } CanReplaceResult
 */

/**
 * Token BPMN-specific modeling rules.
 *
 * @param {EventBus} eventBus
 */
export default function TokenRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(TokenRules, RuleProvider);

TokenRules.$inject = ["eventBus"];

TokenRules.prototype.init = function () {
  this.addRule("connection.start", function (context) {
    const source = context.source;

    return canStartConnection(source);
  });

  this.addRule("connection.create", function (context) {
    const source = context.source,
      target = context.target,
      hints = context.hints || {},
      targetParent = hints.targetParent,
      targetAttach = hints.targetAttach;

    // don't allow incoming connections on
    // newly created boundary events
    // to boundary events
    if (targetAttach) {
      return false;
    }

    // temporarily set target parent for scoping
    // checks to work
    if (targetParent) {
      target.parent = targetParent;
    }

    try {
      return canConnect(source, target);
    } finally {
      // unset temporary target parent
      if (targetParent) {
        target.parent = null;
      }
    }
  });

  this.addRule("connection.reconnect", function (context) {
    const connection = context.connection,
      source = context.source,
      target = context.target;

    return canConnect(source, target, connection);
  });

  this.addRule("connection.updateWaypoints", function (context) {
    return {
      type: context.connection.type,
    };
  });

  this.addRule("shape.resize", function (context) {
    const shape = context.shape,
      newBounds = context.newBounds;

    return canResize(shape, newBounds);
  });

  this.addRule("elements.create", function (context) {
    const elements = context.elements,
      position = context.position,
      target = context.target;

    if (isConnection(target) && !canInsert(elements, target, position)) {
      return false;
    }

    return every(elements, function (element) {
      if (isConnection(element)) {
        return canConnect(element.source, element.target, element);
      }

      return canCreate(element, target, null, position);
    });
  });

  this.addRule("elements.move", function (context) {
    const target = context.target,
      shapes = context.shapes;

    return canMove(shapes, target);
  });

  this.addRule("shape.create", function (context) {
    return canCreate(
      context.shape,
      context.target,
      context.source,
      context.position,
    );
  });

  this.addRule("shape.attach", function (context) {
    return false;
  });

  this.addRule("element.copy", function (context) {
    const element = context.element,
      elements = context.elements;

    return canCopy(elements, element);
  });

  this.addRule("elements.delete", function (context) {
    const elements = context.elements;
    return elements.every((element) => is(element, "bt:BaseToken"));
  });
};

TokenRules.prototype.canConnectAssociation = canConnectAssociation;

TokenRules.prototype.canMove = canMove;

TokenRules.prototype.canReplace = canReplace;

TokenRules.prototype.canDrop = canDrop;

TokenRules.prototype.canInsert = canInsert;

TokenRules.prototype.canAttachTokenOrProcessSnapshot =
  canAttachTokenOrProcessSnapshot;

TokenRules.prototype.canCreate = canCreate;

TokenRules.prototype.canConnect = canConnect;

TokenRules.prototype.canResize = canResize;

TokenRules.prototype.canCopy = canCopy;

/**
 * Utility functions for rule checking
 */

/**
 * Checks if given element can be used for starting connection.
 *
 * @param  {Element} element
 *
 * @return {boolean}
 */
function canStartConnection(element) {
  return isAny(element, ["bpmn:FlowNode", "bt:BaseToken"]);
}

/**
 * @param {Element} source
 * @param {Element} target
 * @param {Connection} connection
 *
 * @return {CanConnectResult}
 */
function canConnect(source, target, connection) {
  if (
    (is(source, "bt:Token") && is(target, "bt:ProcessSnapshot")) ||
    (is(target, "bt:Token") && is(source, "bt:ProcessSnapshot")) ||
    canAttachToken(target, source) ||
    canAttachProcessSnapshot(target, source)
  ) {
    return {
      type: "bpmn:Association",
    };
  }

  return false;
}

/**
 * Can an element be dropped into the target element.
 *
 * @param {Element} element
 * @param {Shape} target
 *
 * @return {boolean}
 */
function canDrop(element, target) {
  if (is(element, "bt:Token")) {
    return isAny(target, ["bpmn:Activity", "bpmn:SequenceFlow"]);
  }
  if (is(element, "bt:ProcessSnapshot")) {
    return is(target, "bpmn:Collaboration");
  }

  return false;
}

/**
 * Check whether the given elements can be replaced. Return all elements which
 * can be replaced.
 *
 * @example
 *
 * ```javascript
 * [{
 *   id: 'IntermediateEvent_1',
 *   type: 'bpmn:StartEvent'
 * },
 * {
 *   id: 'Task_1',
 *   type: 'bpmn:ServiceTask'
 * }]
 * ```
 *
 * @param  {Element[]} elements
 * @param  {Shape} [target]
 * @param  {Point} [position]
 *
 * @return {CanReplaceResult}
 */
function canReplace(elements, target, position) {
  return false;
}

/**
 * @param {Element[]} elements
 * @param {Shape} target
 *
 * @return {boolean}
 */
function canMove(elements, target) {
  return elements.every((element) => is(element, "bt:BaseToken"));
}

/**
 * @param {Shape} shape
 * @param {Shape} target
 * @param {Element} source
 * @param {Point} position
 *
 * @return {boolean}
 */
function canCreate(shape, target, source, position) {
  return canAttachTokenOrProcessSnapshot(shape, target);
}

/**
 * @param {Shape} shape
 * @param {Rect} newBounds
 *
 * @return {boolean}
 */
function canResize(shape, newBounds) {
  return false;
}

function isConnectingToken(source, target) {
  return (
    isAny(source, ["bpmn:SequenceFlow", "bpmn:Activity"]) &&
    is(target, "bt:Token")
  );
}

function isConnectingProcessSnapshot(source, target) {
  return is(source, "bpmn:Participant") && is(target, "bt:ProcessSnapshot");
}

/**
 * @param {Element} source
 * @param {Element} target
 *
 * @return {CanConnectResult}
 */
function canConnectAssociation(source, target) {
  // allow connection associations from activities and sequence flows to tokens
  if (isConnectingToken(source, target)) {
    return true;
  }
  // allow connection associations from activities and sequence flows to tokens
  return !!isConnectingProcessSnapshot(source, target);
}

function canAttachToken(token, target) {
  return (
    is(token, "bt:Token") &&
    isAny(target, ["bpmn:SequenceFlow", "bpmn:Activity"])
  );
}

function canAttachProcessSnapshot(shape, target) {
  return is(shape, "bt:ProcessSnapshot") && is(target, "bpmn:Participant");
}

/**
 * @param {Shape} shape
 * @param {Shape} target
 * drop tokens on sequence flows and activities
 * @return {boolean}
 */
function canAttachTokenOrProcessSnapshot(shape, target) {
  if (
    canAttachToken(shape, target) ||
    canAttachProcessSnapshot(shape, target)
  ) {
    return true;
  }
}

/**
 * @param {Shape} shape
 * @param {Connection} connection
 * @param {Point} position
 *
 * @return {boolean}
 */
function canInsert(shape, connection, position) {
  if (!connection) {
    return false;
  }

  if (Array.isArray(shape)) {
    if (shape.length !== 1) {
      return false;
    }

    shape = shape[0];
  }

  if (connection.source === shape || connection.target === shape) {
    return false;
  }

  // return true if shape can be inserted into connection parent
  return (
    isAny(connection, ["bpmn:SequenceFlow", "bpmn:MessageFlow"]) &&
    !isLabel(connection) &&
    is(shape, "bpmn:FlowNode") &&
    !is(shape, "bpmn:BoundaryEvent") &&
    canDrop(shape, connection.parent, position)
  );
}

/**
 * @param {Element[]} elements
 * @param {Element} element
 *
 * @return {boolean}
 */
function canCopy(elements, element) {
  return false;
}
