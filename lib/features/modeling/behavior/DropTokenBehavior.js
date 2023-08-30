import inherits from "inherits-browser";

import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";

import { is, isAny } from "../util/ModelingUtil";
import { getNewShapePosition } from "../../auto-place/BpmnAutoPlaceUtil";

/**
 * @typedef {import('diagram-js/lib/core/EventBus').default} EventBus
 * @typedef {import('../../rules/BpmnRules').default} BpmnRules
 * @typedef {import('../../modeling/Modeling').default} Modeling
 * @typedef {import('../../auto-place/BpmnAutoPlace').default} Autoplace
 */

/**
 * @param {EventBus} eventBus
 * @param {BpmnRules} bpmnRules
 * @param {Modeling} modeling
 * @param {Autoplace} autoplace
 */
export default function DropTokenBehavior(eventBus, bpmnRules, modeling) {
  CommandInterceptor.call(this, eventBus);

  // TODO: Token

  function moveTokenToTheRightPlace(parent, shape) {
    const newPosition = getNewShapePosition(parent, shape);
    modeling.moveShape(shape, {
      x: newPosition.x - shape.x - shape.width / 2,
      y: newPosition.y - shape.y - shape.height / 2,
    });
  }

  /**
   * Position a token accordingly after dropping it on a flow or activity.
   */
  function positionAndAttachToken(shape, target, shapePositionAndBounds) {
    moveTokenToTheRightPlace(target, shape);
    modeling.connect(target, shape);
  }

  this.preExecute(
    "shape.create",
    function (context) {
      const parent = context.parent,
        shape = context.shape;

      if (bpmnRules.canAttachToken(shape, parent)) {
        context.target = parent;
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
        isAny(context.target, ["bpmn:Activity", "bpmn:SequenceFlow"])
      ) {
        positionAndAttachToken(context.shape, context.target, context.position);
      }
    },
    true,
  );
}

inherits(DropTokenBehavior, CommandInterceptor);

DropTokenBehavior.$inject = ["eventBus", "bpmnRules", "modeling"];
