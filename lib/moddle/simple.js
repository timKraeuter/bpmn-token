import { assign } from "min-dash";

import BpmnModdle from "./bpmn-moddle.js";

import BpmnPackage from "./resources/bpmn.json";
import BpmnDiPackage from "./resources/bpmndi.json";
import DcPackage from "./resources/dc.json";
import DiPackage from "./resources/di.json";

const packages = {
  bpmn: BpmnPackage,
  bpmndi: BpmnDiPackage,
  dc: DcPackage,
  di: DiPackage,
};

export default function (additionalPackages, options) {
  const pks = assign({}, packages, additionalPackages);

  return new BpmnModdle(pks, options);
}
