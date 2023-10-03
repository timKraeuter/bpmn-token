import { assign } from "min-dash";
import { is, isAny } from "../../util/ModelUtil";
import { hasPrimaryModifier } from "diagram-js/lib/util/Mouse";

/**
 * @typedef {import("didi").Injector} Injector
 * @typedef {import("diagram-js/lib/core/EventBus").default} EventBus
 * @typedef {import("diagram-js/lib/features/context-pad/ContextPad").default} ContextPad
 * @typedef {import("../modeling/Modeling").default} Modeling
 * @typedef {import("../modeling/ElementFactory").default} ElementFactory
 * @typedef {import("diagram-js/lib/features/connect/Connect").default} Connect
 * @typedef {import("diagram-js/lib/features/create/Create").default} Create
 * @typedef {import("diagram-js/lib/features/popup-menu/PopupMenu").default} PopupMenu
 * @typedef {import("diagram-js/lib/features/canvas/Canvas").default} Canvas
 * @typedef {import("diagram-js/lib/features/rules/Rules").default} Rules
 * @typedef {import("diagram-js/lib/i18n/translate/translate").default} Translate
 *
 * @typedef {import("../../model/Types").Element} Element
 * @typedef {import("../../model/Types").ModdleElement} ModdleElement
 *
 * @typedef {import("diagram-js/lib/features/context-pad/ContextPadProvider").default<Element>} BaseContextPadProvider
 * @typedef {import("diagram-js/lib/features/context-pad/ContextPadProvider").ContextPadEntries} ContextPadEntries
 * @typedef {import("diagram-js/lib/features/context-pad/ContextPadProvider").ContextPadEntry} ContextPadEntry
 *
 * @typedef { { autoPlace?: boolean; } } ContextPadConfig
 */

/**
 * BPMN-specific context pad provider.
 *
 * @implements {BaseContextPadProvider}
 *
 * @param {ContextPadConfig} config
 * @param {Injector} injector
 * @param {EventBus} eventBus
 * @param {ContextPad} contextPad
 * @param {Modeling} modeling
 * @param {ElementFactory} elementFactory
 * @param {Connect} connect
 * @param {Create} create
 * @param {Translate} translate
 */
export default function TokenContextPadProvider(
  config,
  injector,
  eventBus,
  contextPad,
  modeling,
  elementFactory,
  connect,
  create,
  translate,
) {
  config = config || {};

  contextPad.registerProvider(this);

  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._connect = connect;
  this._create = create;
  this._translate = translate;

  if (config.autoPlace !== false) {
    this._autoPlace = injector.get("autoPlace", false);
  }

  eventBus.on("create.end", 250, function (event) {
    const context = event.context,
      shape = context.shape;

    if (!hasPrimaryModifier(event) || !contextPad.isOpen(shape)) {
      return;
    }

    const entries = contextPad.getEntries(shape);

    if (entries.replace) {
      entries.replace.action.click(event, shape);
    }
  });
}

TokenContextPadProvider.$inject = [
  "config.contextPad",
  "injector",
  "eventBus",
  "contextPad",
  "modeling",
  "elementFactory",
  "connect",
  "create",
  "translate",
];

/**
 * @param {Element} element
 *
 * @return {ContextPadEntries}
 */
TokenContextPadProvider.prototype.getContextPadEntries = function (element) {
  const modeling = this._modeling,
    elementFactory = this._elementFactory,
    connect = this._connect,
    create = this._create,
    autoPlace = this._autoPlace,
    translate = this._translate;

  const actions = {};

  if (element.type === "label") {
    return actions;
  }

  const businessObject = element.businessObject;

  function startConnect(event, element) {
    connect.start(event, element);
  }

  /**
   * Create an append action.
   *
   * @param {string} type
   * @param {string} className
   * @param {string} [title]
   * @param {Object} [options]
   *
   * @return {ContextPadEntry}
   */
  function appendAction(type, className, title, options) {
    if (typeof title !== "string") {
      options = title;
      title = translate("Append {type}", {
        type: type.replace(/^bpmn:/, ""),
      });
    }

    function appendStart(event, element) {
      const shape = elementFactory.createShape(assign({ type: type }, options));
      create.start(event, shape, {
        source: element,
      });
    }

    const append = autoPlace
      ? function (event, element) {
          const shape = elementFactory.createShape(
            assign({ type: type }, options),
          );

          autoPlace.append(element, shape);
        }
      : appendStart;

    return {
      group: "model",
      className: className,
      title: title,
      action: {
        dragstart: appendStart,
        click: append,
      },
    };
  }

  if (
    isAny(businessObject, [
      "bpmn:TextAnnotation",
      "bt:Token",
      "bt:ProcessSnapshot",
    ])
  ) {
    assign(actions, {
      connect: {
        group: "connect",
        className: "bpmn-icon-connection-multi",
        title: translate("Connect using Association"),
        action: {
          click: startConnect,
          dragstart: startConnect,
        },
      },
    });
  }
  if (is(businessObject, "bt:Token")) {
    assign(actions, {
      connect: {
        group: "connect",
        className: "bt-icon-color",
        title: translate("Assign to Process Snapshot"),
        action: {
          click: startConnect,
          dragstart: startConnect,
        },
      },
    });
  }
  if (is(businessObject, "bt:ProcessSnapshot")) {
    assign(actions, {
      connect: {
        group: "connect",
        className: "bt-icon-color",
        title: translate("Assign Token"),
        action: {
          click: startConnect,
          dragstart: startConnect,
        },
      },
    });
  }
  if (isAny(businessObject, ["bpmn:Activity", "bpmn:SequenceFlow"])) {
    assign(actions, {
      "append.token": appendAction(
        "bt:Token",
        "bt-icon-token",
        translate("Add Token"),
      ),
    });
  }
  if (is(businessObject, "bpmn:Participant")) {
    assign(actions, {
      "append.process": appendAction(
        "bt:ProcessSnapshot",
        "bt-icon-process",
        translate("Add Process Snapshot"),
      ),
    });
  }
  if (isAny(businessObject, ["bt:Token", "bt:ProcessSnapshot"])) {
    if (businessObject.shouldExist) {
      assign(actions, {
        "append.process": {
          group: "model",
          className: "bt-icon-no-token",
          title: translate("Change to should not exist"),
          action: {
            click: function (event, element) {
              modeling.updateModdleProperties(element, element.businessObject, {
                shouldExist: false,
              });
            },
          },
        },
      });
    } else {
      assign(actions, {
        "append.process": {
          group: "model",
          className: "bt-icon-token",
          title: translate("Change to should exist"),
          action: {
            click: function (event, element) {
              modeling.updateModdleProperties(element, element.businessObject, {
                shouldExist: true,
              });
            },
          },
        },
      });
    }
  }
  if (isAny(businessObject, ["bt:Token", "bt:ProcessSnapshot"])) {
    assign(actions, {
      delete: {
        group: "edit",
        className: "bpmn-icon-trash",
        title: translate("Remove"),
        action: {
          click: removeElement,
        },
      },
    });
  }

  function removeElement(e, element) {
    modeling.removeElements([element]);
  }

  return actions;
};
