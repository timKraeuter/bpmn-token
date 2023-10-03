declare namespace _default {
  const __depends__: (
    | import("didi").ModuleDeclaration
    | {
        spaceTool: (
          | string
          | typeof import("../space-tool/BpmnSpaceTool").default
        )[];
      }
  )[];
  const __init__: string[];
  const paletteProvider: (string | typeof TokenPaletteProvider)[];
}
export default _default;
import TokenPaletteProvider from "./TokenPaletteProvider";
