import inherits from "inherits-browser";

import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";

import { is } from "../util/ModelingUtil";
import randomColor from "randomcolor";

/**
 * @typedef {import("diagram-js/lib/core/EventBus").default} EventBus
 * @typedef {import("../../modeling/Modeling").default} Modeling
 */

/**
 * @param {EventBus} eventBus
 * @param {Modeling} modeling
 */
export default function TokenColorBehavior(eventBus, modeling) {
    CommandInterceptor.call(this, eventBus);

    // TODO: Token

    function getRandomHighContrastColor(shape, colorPool) {
        const colors = randomColor({ seed: shape.businessObject.id, count: colorPool });
        const highContrastColors = colors.filter(c => getContrastYIQ(c) < 200);
        if (highContrastColors.length < 1) {
            return getRandomHighContrastColor(shape, colorPool + 5);
        }
        return highContrastColors[0];
    }

    function getContrastYIQ(hexcolor) {
        const r = parseInt(hexcolor.substring(1, 3), 16);
        const g = parseInt(hexcolor.substring(3, 5), 16);
        const b = parseInt(hexcolor.substring(5, 7), 16);
        return ((r * 299) + (g * 587) + (b * 114)) / 1000;
    }

    this.preExecute(
        "shape.create",
        function(context) {
            // TODO: Colors should be meaningful, i.e., tokens have the same colors as process snapshots.
            // There is a relation between process snapshots and tokens.
            const shape = context.shape;
            if (is(shape, "bt:ProcessSnapshot")) {
                modeling.setColor(shape, {
                    fill: getRandomHighContrastColor(shape, 5)
                });
            }
        },
        true
    );
}

inherits(TokenColorBehavior, CommandInterceptor);

TokenColorBehavior.$inject = ["eventBus", "modeling"];
