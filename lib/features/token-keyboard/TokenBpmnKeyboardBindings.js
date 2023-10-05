import inherits from "inherits-browser";

import KeyboardBindings from "diagram-js/lib/features/keyboard/KeyboardBindings";
import { isKey } from "diagram-js/lib/features/keyboard/KeyboardUtil";

/**
 * @typedef {import('didi').Injector} Injector
 * @typedef {import('diagram-js/lib/features/editor-actions/EditorActions').default} EditorActions
 * @typedef {import('diagram-js/lib/features/keyboard/Keyboard').default} Keyboard
 */

/**
 * Token BPMN 2.0 specific keyboard bindings.
 *
 * @param {Injector} injector
 */
export default function TokenBpmnKeyboardBindings(injector) {
  injector.invoke(KeyboardBindings, this);
}

inherits(TokenBpmnKeyboardBindings, KeyboardBindings);

TokenBpmnKeyboardBindings.$inject = ["injector"];

/**
 * Register available keyboard bindings.
 *
 * @param {Keyboard} keyboard
 * @param {EditorActions} editorActions
 */
TokenBpmnKeyboardBindings.prototype.registerBindings = function (
  keyboard,
  editorActions,
) {
  // inherit default bindings
  KeyboardBindings.prototype.registerBindings.call(
    this,
    keyboard,
    editorActions,
  );

  /**
   * Add keyboard binding if respective editor action
   * is registered.
   *
   * @param {string} action name
   * @param {Function} fn that implements the key binding
   */
  function addListener(action, fn) {
    if (editorActions.isRegistered(action)) {
      keyboard.addListener(1001, fn);
    }
  }

  // search labels
  // CTRL + F
  addListener("find", function (context) {
    const event = context.keyEvent;

    if (keyboard.isKey(["f", "F"], event) && keyboard.isCmd(event)) {
      editorActions.trigger("find");

      return true;
    }
  });

  // delete selected element
  // DEL
  addListener("removeSelection", function (context) {
    const event = context.keyEvent;

    if (isKey(["Backspace", "Delete", "Del"], event)) {
      editorActions.trigger("removeSelection");

      return true;
    }
  });
};
