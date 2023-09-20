import inherits from "inherits-browser";

import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";

import { is } from "../util/ModelingUtil";
import randomColor from "randomcolor";
import {
  findAllProcessSnapshots,
  findAllTokens,
  isLinkedToSnapshot,
  isToken,
} from "../../../util/TokenUtil";

/**
 * @typedef {import("diagram-js/lib/core/EventBus").default} EventBus
 * @typedef {import("../../modeling/Modeling").default} Modeling
 * @typedef {import("../../../model/Types").Moddle} Moddle
 */

/**
 * @param {EventBus} eventBus
 * @param {Modeling} modeling
 * @param {Moddle} moddle
 */
export default function TokenSnapshotBehavior(eventBus, modeling, moddle) {
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

  // Add extensionElements to the parent of a token or process snapshot if needed.
  this.preExecute(
    "shape.create",
    function (context) {
      const parent = context.parent,
        shape = context.shape;

      if (
        is(shape, "bt:BaseToken") &&
        !parent.businessObject.extensionElements
      ) {
        modeling.updateModdleProperties(parent, parent.businessObject, {
          extensionElements: moddle.create("bpmn:ExtensionElements", {
            values: [],
          }),
        });
      }
    },
    true,
  );

  // Assign the color of the process snapshot to the token and link them.
  function linkTokenToSnapshot(snapshot, token) {
    assignSnapshotColorToToken(snapshot, token);
    updateTokenProperties(token, snapshot);
  }

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

  function removeConnectionAndLinkTokenToSnapshot(token, snapshot, context) {
    modeling.removeConnection(context.connection);
    linkTokenToSnapshot(snapshot, token);
  }

  // We currently abuse creating a temporary connection to assign tokens.
  this.postExecuted(
    "connection.create",
    function (context) {
      const source = context.source;
      const target = context.target;
      if (isToken(source) && is(target, "bt:ProcessSnapshot")) {
        removeConnectionAndLinkTokenToSnapshot(source, target, context);
      }
      if (isToken(target) && is(source, "bt:ProcessSnapshot")) {
        removeConnectionAndLinkTokenToSnapshot(target, source, context);
      }
    },
    true,
  );

  this.postExecuted(
    "shape.create",
    function (context) {
      const shape = context.shape;
      if (isToken(shape)) {
        linkToSnapshotIfOnlyOneExists(shape, context.rootElement);
      }
      if (is(shape, "bt:ProcessSnapshot")) {
        linkAllTokensIfNoOtherSnapshotExists(shape, context.rootElement);
      }
    },
    true,
  );

  function linkToSnapshotIfOnlyOneExists(token, root) {
    const processSnapshots = findAllProcessSnapshots(root);
    if (processSnapshots.length === 1) {
      const singleProcessSnapshot = processSnapshots[0];
      linkTokenToSnapshot(singleProcessSnapshot, token);
    }
  }

  function linkAllTokensIfNoOtherSnapshotExists(snapshot, root) {
    const processSnapshots = findAllProcessSnapshots(root);
    if (processSnapshots.length === 1) {
      findAllTokens(root).forEach((token) =>
        linkTokenToSnapshot(snapshot, token),
      );
    }
  }

  this.postExecuted(
    "shape.delete",
    function (context) {
      const shape = context.shape;
      if (is(shape, "bt:ProcessSnapshot")) {
        unlinkAllLinkedTokens(shape, context.rootElement);
      }
    },
    true,
  );

  function unlinkAllLinkedTokens(deletedSnapshot, root) {
    findAllTokens(root)
      .filter((token) => isLinkedToSnapshot(token, deletedSnapshot))
      .forEach((token) => unlinkTokenFromSnapshot(deletedSnapshot, token));
  }

  function unlinkTokenFromSnapshot(deletedSnapshot, token) {
    modeling.setColor(token, {
      fill: "#000000",
    });
    modeling.updateModdleProperties(token, token.businessObject, {});
  }
}

inherits(TokenSnapshotBehavior, CommandInterceptor);

TokenSnapshotBehavior.$inject = ["eventBus", "modeling", "moddle"];
