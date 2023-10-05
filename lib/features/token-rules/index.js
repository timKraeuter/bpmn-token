import RulesModule from "diagram-js/lib/features/rules";

import TokenRules from "./TokenRules";

export default {
  __depends__: [RulesModule],
  __init__: ["bpmnRules"],
  bpmnRules: ["type", TokenRules],
};
