import inherits from "inherits-browser";

import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";

import { is } from "../util/ModelingUtil";
import randomColor from "randomcolor";

/**
 * @typedef {import('diagram-js/lib/core/EventBus').default} EventBus
 * @typedef {import('../../modeling/Modeling').default} Modeling
 */

/**
 * @param {EventBus} eventBus
 * @param {Modeling} modeling
 */
export default function TokenColorBehavior(eventBus, modeling) {
  CommandInterceptor.call(this, eventBus);

  // TODO: Token

  this.preExecute(
    "shape.create",
    function (context) {
      // TODO: Colors should be meaningful, i.e., tokens have the same colors as process snapshots.
      // Process snapshots have different colors.
      // There is a relation between process snapshots and tokens.
      const shape = context.shape;
      if (is(shape, "bt:ProcessSnapshot")) {
        const color = randomColor({ seed: shape.businessObject.id });
        modeling.setColor(shape, {
          fill: color,
        });
      }
    },
    true,
  );
}

inherits(TokenColorBehavior, CommandInterceptor);

TokenColorBehavior.$inject = ["eventBus", "modeling"];
