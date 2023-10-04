import { every, find, forEach, some } from "min-dash";

import inherits from "inherits-browser";

import { getBusinessObject } from "../../util/ModelUtil";

import { getParent, isAny, is } from "../modeling/util/ModelingUtil";

import { isLabel } from "../../util/LabelUtil";

import {
  hasCompensateEventDefinition,
  hasErrorEventDefinition,
  hasEscalationEventDefinition,
  isEventSubProcess,
  isInterrupting,
} from "../../util/DiUtil";

import RuleProvider from "diagram-js/lib/features/rules/RuleProvider";

import { getBoundaryAttachment as isBoundaryAttachment } from "../snapping/BpmnSnappingUtil";

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
export default function TokenBpmnRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(TokenBpmnRules, RuleProvider);

TokenBpmnRules.$inject = ["eventBus"];

TokenBpmnRules.prototype.init = function () {
  this.addRule("connection.start", function (context) {
    var source = context.source;

    return canStartConnection(source);
  });

  this.addRule("connection.create", function (context) {
    var source = context.source,
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
    var connection = context.connection,
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
    var shape = context.shape,
      newBounds = context.newBounds;

    return canResize(shape, newBounds);
  });

  this.addRule("elements.create", function (context) {
    var elements = context.elements,
      position = context.position,
      target = context.target;

    if (isConnection(target) && !canInsert(elements, target, position)) {
      return false;
    }

    return every(elements, function (element) {
      if (isConnection(element)) {
        return canConnect(element.source, element.target, element);
      }

      if (element.host) {
        return canAttach(element, element.host, null, position);
      }

      return canCreate(element, target, null, position);
    });
  });

  this.addRule("elements.move", function (context) {
    var target = context.target,
      shapes = context.shapes,
      position = context.position;

    return (
      canAttach(shapes, target, null, position) ||
      canReplace(shapes, target, position) ||
      canMove(shapes, target, position) ||
      canInsert(shapes, target, position)
    );
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
    return canAttach(context.shape, context.target, null, context.position);
  });

  this.addRule("element.copy", function (context) {
    var element = context.element,
      elements = context.elements;

    return canCopy(elements, element);
  });

  this.addRule("elements.delete", function (context) {
    const elements = context.elements;
    console.log(context);
    return elements.every((element) => is(element, "bt:BaseToken"));
  });
};

TokenBpmnRules.prototype.canConnectMessageFlow = canConnectMessageFlow;

TokenBpmnRules.prototype.canConnectSequenceFlow = canConnectSequenceFlow;

TokenBpmnRules.prototype.canConnectDataAssociation = canConnectDataAssociation;

TokenBpmnRules.prototype.canConnectAssociation = canConnectAssociation;

TokenBpmnRules.prototype.canMove = canMove;

TokenBpmnRules.prototype.canAttach = canAttach;

TokenBpmnRules.prototype.canReplace = canReplace;

TokenBpmnRules.prototype.canDrop = canDrop;

TokenBpmnRules.prototype.canInsert = canInsert;

TokenBpmnRules.prototype.canAttachTokenOrProcessSnapshot =
  canAttachTokenOrProcessSnapshot;

TokenBpmnRules.prototype.canCreate = canCreate;

TokenBpmnRules.prototype.canConnect = canConnect;

TokenBpmnRules.prototype.canResize = canResize;

TokenBpmnRules.prototype.canCopy = canCopy;

/**
 * Utility functions for rule checking
 */

/**
 * Checks if given element can be used for starting connection.
 *
 * @param  {Element} source
 *
 * @return {boolean}
 */
function canStartConnection(element) {
  if (nonExistingOrLabel(element)) {
    return null;
  }

  return isAny(element, [
    "bpmn:FlowNode",
    "bpmn:InteractionNode",
    "bpmn:DataObjectReference",
    "bpmn:DataStoreReference",
    "bpmn:Group",
    "bpmn:TextAnnotation",
    "bt:Token", // TODO: Token
    "bt:ProcessSnapshot", // TODO: ProcessSnapshot
  ]);
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function nonExistingOrLabel(element) {
  return !element || isLabel(element);
}

/**
 * @param {Element} element
 *
 * @return {ModdleElement}
 */
function getOrganizationalParent(element) {
  do {
    if (is(element, "bpmn:Process")) {
      return getBusinessObject(element);
    }

    if (is(element, "bpmn:Participant")) {
      return (
        getBusinessObject(element).processRef || getBusinessObject(element)
      );
    }
  } while ((element = element.parent));
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function isTextAnnotation(element) {
  return is(element, "bpmn:TextAnnotation");
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function isCompensationBoundary(element) {
  return (
    is(element, "bpmn:BoundaryEvent") &&
    hasEventDefinition(element, "bpmn:CompensateEventDefinition")
  );
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function isForCompensation(element) {
  return getBusinessObject(element).isForCompensation;
}

/**
 * @param {Element} a
 * @param {Element} b
 *
 * @return {boolean}
 */
function isSameOrganization(a, b) {
  var parentA = getOrganizationalParent(a),
    parentB = getOrganizationalParent(b);

  return parentA === parentB;
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function isMessageFlowSource(element) {
  return (
    is(element, "bpmn:InteractionNode") &&
    !is(element, "bpmn:BoundaryEvent") &&
    (!is(element, "bpmn:Event") ||
      (is(element, "bpmn:ThrowEvent") &&
        hasEventDefinitionOrNone(element, "bpmn:MessageEventDefinition")))
  );
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function isMessageFlowTarget(element) {
  return (
    is(element, "bpmn:InteractionNode") &&
    !isForCompensation(element) &&
    (!is(element, "bpmn:Event") ||
      (is(element, "bpmn:CatchEvent") &&
        hasEventDefinitionOrNone(element, "bpmn:MessageEventDefinition"))) &&
    !(
      is(element, "bpmn:BoundaryEvent") &&
      !hasEventDefinition(element, "bpmn:MessageEventDefinition")
    )
  );
}

/**
 * @param {Element} element
 *
 * @return {ModdleElement}
 */
function getScopeParent(element) {
  var parent = element;

  while ((parent = parent.parent)) {
    if (is(parent, "bpmn:FlowElementsContainer")) {
      return getBusinessObject(parent);
    }

    if (is(parent, "bpmn:Participant")) {
      return getBusinessObject(parent).processRef;
    }
  }

  return null;
}

/**
 * @param {Element} a
 * @param {Element} b
 *
 * @return {boolean}
 */
function isSameScope(a, b) {
  var scopeParentA = getScopeParent(a),
    scopeParentB = getScopeParent(b);

  return scopeParentA === scopeParentB;
}

/**
 * @param {Element} element
 * @param {string} eventDefinition
 *
 * @return {boolean}
 */
function hasEventDefinition(element, eventDefinition) {
  var businessObject = getBusinessObject(element);

  return !!find(businessObject.eventDefinitions || [], function (definition) {
    return is(definition, eventDefinition);
  });
}

/**
 * @param {Element} element
 * @param {string} eventDefinition
 *
 * @return {boolean}
 */
function hasEventDefinitionOrNone(element, eventDefinition) {
  var businessObject = getBusinessObject(element);

  return (businessObject.eventDefinitions || []).every(function (definition) {
    return is(definition, eventDefinition);
  });
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function isSequenceFlowSource(element) {
  return (
    is(element, "bpmn:FlowNode") &&
    !is(element, "bpmn:EndEvent") &&
    !isEventSubProcess(element) &&
    !(
      is(element, "bpmn:IntermediateThrowEvent") &&
      hasEventDefinition(element, "bpmn:LinkEventDefinition")
    ) &&
    !isCompensationBoundary(element) &&
    !isForCompensation(element)
  );
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function isSequenceFlowTarget(element) {
  return (
    is(element, "bpmn:FlowNode") &&
    !is(element, "bpmn:StartEvent") &&
    !is(element, "bpmn:BoundaryEvent") &&
    !isEventSubProcess(element) &&
    !(
      is(element, "bpmn:IntermediateCatchEvent") &&
      hasEventDefinition(element, "bpmn:LinkEventDefinition")
    ) &&
    !isForCompensation(element)
  );
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function isEventBasedTarget(element) {
  return (
    is(element, "bpmn:ReceiveTask") ||
    (is(element, "bpmn:IntermediateCatchEvent") &&
      (hasEventDefinition(element, "bpmn:MessageEventDefinition") ||
        hasEventDefinition(element, "bpmn:TimerEventDefinition") ||
        hasEventDefinition(element, "bpmn:ConditionalEventDefinition") ||
        hasEventDefinition(element, "bpmn:SignalEventDefinition")))
  );
}

/**
 * @param {Element} element
 *
 * @return {Shape[]}
 */
function getParents(element) {
  var parents = [];

  while (element) {
    element = element.parent;

    if (element) {
      parents.push(element);
    }
  }

  return parents;
}

/**
 * @param {Shape} possibleParent
 * @param {Element} element
 *
 * @return {boolean}
 */
function isParent(possibleParent, element) {
  var allParents = getParents(element);

  return allParents.indexOf(possibleParent) !== -1;
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
    (is(target, "bt:Token") &&
      isAny(source, ["bpmn:Activity", "bpmn:SequenceFlow"])) ||
    (is(target, "bt:ProcessSnapshot") && is(source, "bpmn:Participant"))
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
  // Token
  if (isAny(element, ["bt:Token"])) {
    return isAny(target, [
      "bpmn:Activity",
      "bpmn:SequenceFlow",
      "bpmn:Participant",
    ]);
  }
  // Snapshot
  if (isAny(element, ["bt:ProcessSnapshot"])) {
    return isAny(target, ["bpmn:Collaboration"]);
  }

  return false;
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function isBoundaryEvent(element) {
  return !isLabel(element) && is(element, "bpmn:BoundaryEvent");
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function isLane(element) {
  return is(element, "bpmn:Lane");
}

/**
 * `bpmn:IntermediateThrowEvents` are treated as boundary events during create.
 *
 * @param {Element} element
 *
 * @return {boolean}
 */
function isBoundaryCandidate(element) {
  if (isBoundaryEvent(element)) {
    return true;
  }

  if (
    is(element, "bpmn:IntermediateThrowEvent") &&
    hasNoEventDefinition(element)
  ) {
    return true;
  }

  return (
    is(element, "bpmn:IntermediateCatchEvent") &&
    hasCommonBoundaryIntermediateEventDefinition(element)
  );
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function hasNoEventDefinition(element) {
  var businessObject = getBusinessObject(element);

  return (
    businessObject &&
    !(businessObject.eventDefinitions && businessObject.eventDefinitions.length)
  );
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function hasCommonBoundaryIntermediateEventDefinition(element) {
  return hasOneOfEventDefinitions(element, [
    "bpmn:MessageEventDefinition",
    "bpmn:TimerEventDefinition",
    "bpmn:SignalEventDefinition",
    "bpmn:ConditionalEventDefinition",
  ]);
}

/**
 * @param {Element} element
 * @param {string[]} eventDefinitions
 *
 * @return {boolean}
 */
function hasOneOfEventDefinitions(element, eventDefinitions) {
  return eventDefinitions.some(function (definition) {
    return hasEventDefinition(element, definition);
  });
}

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
function isReceiveTaskAfterEventBasedGateway(element) {
  return (
    is(element, "bpmn:ReceiveTask") &&
    find(element.incoming, function (incoming) {
      return is(incoming.source, "bpmn:EventBasedGateway");
    })
  );
}

/**
 * TODO(philippfromme): remove `source` parameter
 *
 * @param {Element[]} elements
 * @param {Shape} target
 * @param {Element} source
 * @param {Point} [position]
 *
 * @return {boolean | "attach"}
 */
function canAttach(elements, target, source, position) {
  if (!Array.isArray(elements)) {
    elements = [elements];
  }

  // only (re-)attach one element at a time
  if (elements.length !== 1) {
    return false;
  }

  var element = elements[0];

  // do not attach labels
  if (isLabel(element)) {
    return false;
  }

  // only handle boundary events
  if (!isBoundaryCandidate(element)) {
    return false;
  }

  // disallow drop on event sub processes
  if (isEventSubProcess(target)) {
    return false;
  }

  // only allow drop on non compensation activities
  if (!is(target, "bpmn:Activity") || isForCompensation(target)) {
    return false;
  }

  // only attach to subprocess border
  if (position && !isBoundaryAttachment(position, target)) {
    return false;
  }

  // do not attach on receive tasks after event based gateways
  if (isReceiveTaskAfterEventBasedGateway(target)) {
    return false;
  }

  return "attach";
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
  if (!target) {
    return false;
  }

  var canExecute = {
    replacements: [],
  };

  forEach(elements, function (element) {
    if (!isEventSubProcess(target)) {
      if (
        is(element, "bpmn:StartEvent") &&
        element.type !== "label" &&
        canDrop(element, target)
      ) {
        // replace a non-interrupting start event by a blank interrupting start event
        // when the target is not an event sub process
        if (!isInterrupting(element)) {
          canExecute.replacements.push({
            oldElementId: element.id,
            newElementType: "bpmn:StartEvent",
          });
        }

        // replace an error/escalation/compensate start event by a blank interrupting start event
        // when the target is not an event sub process
        if (
          hasErrorEventDefinition(element) ||
          hasEscalationEventDefinition(element) ||
          hasCompensateEventDefinition(element)
        ) {
          canExecute.replacements.push({
            oldElementId: element.id,
            newElementType: "bpmn:StartEvent",
          });
        }

        // replace a typed start event by a blank interrupting start event
        // when the target is a sub process but not an event sub process
        if (
          hasOneOfEventDefinitions(element, [
            "bpmn:MessageEventDefinition",
            "bpmn:TimerEventDefinition",
            "bpmn:SignalEventDefinition",
            "bpmn:ConditionalEventDefinition",
          ]) &&
          is(target, "bpmn:SubProcess")
        ) {
          canExecute.replacements.push({
            oldElementId: element.id,
            newElementType: "bpmn:StartEvent",
          });
        }
      }
    }

    if (!is(target, "bpmn:Transaction")) {
      if (
        hasEventDefinition(element, "bpmn:CancelEventDefinition") &&
        element.type !== "label"
      ) {
        if (is(element, "bpmn:EndEvent") && canDrop(element, target)) {
          canExecute.replacements.push({
            oldElementId: element.id,
            newElementType: "bpmn:EndEvent",
          });
        }

        if (
          is(element, "bpmn:BoundaryEvent") &&
          canAttach(element, target, null, position)
        ) {
          canExecute.replacements.push({
            oldElementId: element.id,
            newElementType: "bpmn:BoundaryEvent",
          });
        }
      }
    }
  });

  return canExecute.replacements.length ? canExecute : false;
}

/**
 * @param {Element[]} elements
 * @param {Shape} target
 *
 * @return {boolean}
 */
function canMove(elements, target) {
  // do not move selection containing lanes
  if (some(elements, isLane)) {
    return false;
  }

  // allow default move check to start move operation
  if (!target) {
    return true;
  }

  return elements.every(function (element) {
    return canDrop(element, target);
  });
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

/**
 * Check whether one of the elements to be connected is a text annotation.
 *
 * @param {Element} source
 * @param {Element} target
 *
 * @return {boolean}
 */
function isOneTextAnnotation(source, target) {
  var sourceTextAnnotation = isTextAnnotation(source),
    targetTextAnnotation = isTextAnnotation(target);

  return (
    (sourceTextAnnotation || targetTextAnnotation) &&
    sourceTextAnnotation !== targetTextAnnotation
  );
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
  // TODO: Token
  // allow connection associations from activities and sequence flows to tokens
  if (isConnectingToken(source, target)) {
    return true;
  }
  // allow connection associations from activities and sequence flows to tokens
  if (isConnectingProcessSnapshot(source, target)) {
    return true;
  }

  // compensation boundary events are exception
  if (isCompensationBoundary(source) && isForCompensation(target)) {
    return true;
  }

  // don't connect parent <-> child
  if (isParent(target, source) || isParent(source, target)) {
    return false;
  }

  // allow connection of associations between <!TextAnnotation> and <TextAnnotation>
  if (isOneTextAnnotation(source, target)) {
    return true;
  }

  // can connect associations where we can connect
  // data associations, too (!)
  return !!canConnectDataAssociation(source, target);
}

/**
 * @param {Element} source
 * @param {Element} target
 *
 * @return {boolean}
 */
function canConnectMessageFlow(source, target) {
  // during connect user might move mouse out of canvas
  // https://github.com/bpmn-io/bpmn-js/issues/1033
  if (getRootElement(source) && !getRootElement(target)) {
    return false;
  }

  return (
    isMessageFlowSource(source) &&
    isMessageFlowTarget(target) &&
    !isSameOrganization(source, target)
  );
}

/**
 * @param {Element} source
 * @param {Element} target
 *
 * @return {boolean}
 */
function canConnectSequenceFlow(source, target) {
  return (
    isSequenceFlowSource(source) &&
    isSequenceFlowTarget(target) &&
    isSameScope(source, target) &&
    !(is(source, "bpmn:EventBasedGateway") && !isEventBasedTarget(target))
  );
}

/**
 * @param {Element} source
 * @param {Element} target
 *
 * @return {CanConnectResult}
 */
function canConnectDataAssociation(source, target) {
  if (
    isAny(source, ["bpmn:DataObjectReference", "bpmn:DataStoreReference"]) &&
    isAny(target, ["bpmn:Activity", "bpmn:ThrowEvent"])
  ) {
    return { type: "bpmn:DataInputAssociation" };
  }

  if (
    isAny(target, ["bpmn:DataObjectReference", "bpmn:DataStoreReference"]) &&
    isAny(source, ["bpmn:Activity", "bpmn:CatchEvent"])
  ) {
    return { type: "bpmn:DataOutputAssociation" };
  }

  return false;
}

function canAttachToken(shape, target) {
  return (
    is(shape, "bt:Token") &&
    isAny(target, ["bpmn:SequenceFlow", "bpmn:Activity"])
  );
}

function canAttachProcessSnapshot(shape, target) {
  return is(shape, "bt:ProcessSnapshot") && is(target, "bpmn:Participant");
}

// TODO: Token
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
function includes(elements, element) {
  return elements && element && elements.indexOf(element) !== -1;
}

/**
 * @param {Element[]} elements
 * @param {Element} element
 *
 * @return {boolean}
 */
function canCopy(elements, element) {
  if (isLabel(element)) {
    return true;
  }

  if (is(element, "bpmn:Lane") && !includes(elements, element.parent)) {
    return false;
  }

  return true;
}

/**
 * @param {Element} element
 *
 * @return {Element|null}
 */
function getRootElement(element) {
  return (
    getParent(element, "bpmn:Process") ||
    getParent(element, "bpmn:Collaboration")
  );
}
