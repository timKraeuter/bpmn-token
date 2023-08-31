import inherits from "inherits-browser";

import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";

import { getNewShapePosition } from "../../auto-place/BpmnAutoPlaceUtil";
import { is } from "../util/ModelingUtil";

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

  function compensateSequenceFlow(target, tokenShape) {
    // GridAutoplace somehow adds 5 to the y position. Probably quarter of the height or something.
    if (is(target, "bpmn:SequenceFlow")) {
      return tokenShape.height / 4;
    }
    return 0;
  }

  function reposition(target, tokenShape) {
    const newPosition = getNewShapePosition(target, tokenShape);
    modeling.moveShape(tokenShape, {
      x: newPosition.x - tokenShape.x - tokenShape.width / 2,
      y:
        newPosition.y -
        tokenShape.y -
        tokenShape.height / 2 +
        compensateSequenceFlow(target, tokenShape),
    });
  }

  /**
   * Position a token accordingly after dropping it on a flow or activity.
   */
  function repositionAndAttach(tokenShape, target) {
    reposition(target, tokenShape);
    modeling.connect(target, tokenShape);
  }

  this.preExecute(
    "shape.create",
    function (context) {
      const parent = context.parent,
        shape = context.shape;

      if (bpmnRules.canAttachTokenOrProcessSnapshot(shape, parent)) {
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
        bpmnRules.canAttachTokenOrProcessSnapshot(context.shape, context.target)
      ) {
        repositionAndAttach(context.shape, context.target);
      }
    },
    true,
  );
}

inherits(DropTokenBehavior, CommandInterceptor);

DropTokenBehavior.$inject = ["eventBus", "bpmnRules", "modeling"];
