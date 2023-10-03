import { assign } from "min-dash";

import { getDi } from "../../util/ModelUtil";

/**
 * @typedef {import('diagram-js/lib/features/palette/Palette').default} Palette
 * @typedef {import('diagram-js/lib/features/create/Create').default} Create
 * @typedef {import('diagram-js/lib/core/ElementFactory').default} ElementFactory
 * @typedef {import('diagram-js/lib/i18n/translate/translate').default} Translate
 */

/**
 * A palette provider for BPMN token elements.
 *
 * @param {Palette} palette
 * @param {Create} create
 * @param {ElementFactory} elementFactory
 * @param {Translate} translate
 */
export default function TokenPaletteProvider(
  palette,
  create,
  elementFactory,
  translate,
) {
  this._create = create;
  this._elementFactory = elementFactory;
  this._translate = translate;

  palette.registerProvider(this);
}

TokenPaletteProvider.$inject = [
  "palette",
  "create",
  "elementFactory",
  "translate",
];

/**
 * @return {PaletteEntries}
 */
TokenPaletteProvider.prototype.getPaletteEntries = function () {
  const actions = {},
    create = this._create,
    elementFactory = this._elementFactory,
    translate = this._translate;

  function createAction(type, group, className, title, options) {
    function createListener(event) {
      const shape = elementFactory.createShape(assign({ type: type }, options));

      if (options) {
        const di = getDi(shape);
        di.isExpanded = options.isExpanded;
      }

      create.start(event, shape);
    }

    const shortType = type.replace(/^bpmn:/, "");

    return {
      group: group,
      className: className,
      title: title || translate("Create {type}", { type: shortType }),
      action: {
        dragstart: createListener,
        click: createListener,
      },
    };
  }

  assign(actions, {
    "create.processSnapshot": createAction(
      "bt:ProcessSnapshot",
      "token",
      "bt-icon-process",
      translate("Create Process Snapshot"),
    ),
    "create.token": createAction(
      "bt:Token",
      "token",
      "bt-icon-token",
      translate("Create Token"),
    ),
  });

  return actions;
};
