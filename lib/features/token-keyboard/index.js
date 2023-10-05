import KeyboardModule from "diagram-js/lib/features/keyboard";

import TokenKeyboardBindings from "./TokenKeyboardBindings";

export default {
  __depends__: [KeyboardModule],
  __init__: ["keyboardBindings"],
  keyboardBindings: ["type", TokenKeyboardBindings],
};
