import inherits from "inherits-browser";

import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";

import { is, isAny } from "../util/ModelingUtil";

/**
 * @typedef {import('diagram-js/lib/core/EventBus').default} EventBus
 * @typedef {import('../../rules/BpmnRules').default} BpmnRules
 * @typedef {import('../../modeling/Modeling').default} Modeling
 */

/**
 * @param {EventBus} eventBus
 * @param {BpmnRules} bpmnRules
 * @param {Modeling} modeling
 */
export default function DropTokenBehavior(eventBus, bpmnRules, modeling) {
  CommandInterceptor.call(this, eventBus);
  // TODO: Token

  /**
   * Position a token accordingly after dropping it on a flow or activity.
   */
  function appendToken(shape, parent, shapePositionAndBounds) {
    console.log(shape);
    console.log(parent);
    console.log(shapePositionAndBounds);
  }

  this.preExecute(
    "shape.create",
    function (context) {
      const parent = context.parent,
        shape = context.shape;

      if (bpmnRules.canInsert(shape, parent)) {
        context.targetFlow = parent;
        context.parent = parent.parent;
      }
    },
    true,
  );

  this.postExecuted(
    "shape.create",
    function (context) {
      if (
        is(context.shape, "bt:Token") &&
        isAny(context.parent, ["bpmn:Activity", "bpmn:SequenceFlow"])
      ) {
        console.log("should be added to activity");
        appendToken(context.shape, context.parent, context.position);
      }
    },
    true,
  );
}

inherits(DropTokenBehavior, CommandInterceptor);

DropTokenBehavior.$inject = ["eventBus", "bpmnRules", "modeling"];
