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
    const colors = randomColor({
      seed: shape.businessObject.id,
      count: colorPool,
    });
    const highContrastColors = colors.filter((c) => getContrastYIQ(c) < 200);
    if (highContrastColors.length < 1) {
      return getRandomHighContrastColor(shape, colorPool + 5);
    }
    return highContrastColors[0];
  }

  function getContrastYIQ(hexcolor) {
    const r = parseInt(hexcolor.substring(1, 3), 16);
    const g = parseInt(hexcolor.substring(3, 5), 16);
    const b = parseInt(hexcolor.substring(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  // Assign a random color to a process snapshot.
  this.preExecute(
    "shape.create",
    function (context) {
      const shape = context.shape;
      if (is(shape, "bt:ProcessSnapshot")) {
        modeling.setColor(shape, {
          fill: getRandomHighContrastColor(shape, 5),
        });
      }
    },
    true,
  );

  function assignSnapshotColorToToken(snapshot, token) {
    modeling.setColor(token, {
      fill: snapshot.di.fill,
    });
  }

  function updateTokenProperties(token, snapshot) {
    modeling.updateModdleProperties(token, token.businessObject, {
      processSnapshot: snapshot.businessObject,
    });
  }

  // Assign the color of the process snapshot to the token and link them.
  function removeConnectionAndChangeColorAndUpdateModdle(
    token,
    snapshot,
    context,
  ) {
    assignSnapshotColorToToken(snapshot, token);
    modeling.removeConnection(context.connection);
    updateTokenProperties(token, snapshot);
  }

  // We currently abuse creating a temporary connection to assign tokens.
  this.postExecuted(
    "connection.create",
    function (context) {
      const source = context.source;
      const target = context.target;
      if (is(source, "bt:Token") && is(target, "bt:ProcessSnapshot")) {
        removeConnectionAndChangeColorAndUpdateModdle(source, target, context);
      }
      if (is(target, "bt:Token") && is(source, "bt:ProcessSnapshot")) {
        removeConnectionAndChangeColorAndUpdateModdle(target, source, context);
      }
    },
    true,
  );

  this.postExecuted(
    "shape.create",
    function (context) {
      const shape = context.shape;
      if (is(shape, "bt:Token")) {
        assignToProcessSnapshotIfOnlyOneExists(shape, context.rootElement);
      }
    },
    true,
  );

  function assignToProcessSnapshotIfOnlyOneExists(token, root) {
    const processSnapshots = root.children.filter((child) =>
      is(child, "bt:ProcessSnapshot"),
    );
    if (processSnapshots.length === 1) {
      const singleProcessSnapshot = processSnapshots[0];
      assignSnapshotColorToToken(singleProcessSnapshot, token);
      updateTokenProperties(token, singleProcessSnapshot);
    }
  }
}

inherits(TokenColorBehavior, CommandInterceptor);

TokenColorBehavior.$inject = ["eventBus", "modeling"];
