/**
 * A renderer for BPMN elements
 *
 */
export default class BpmnRenderer extends BaseRenderer {
  static $inject: string[];

  /**
   * @param config
   * @param eventBus
   * @param styles
   * @param pathMap
   * @param canvas
   * @param textRenderer
   * @param priority
   */
  constructor(
    config: BpmnRendererConfig,
    eventBus: import("diagram-js/lib/core/EventBus").default,
    styles: import("diagram-js/lib/draw/Styles").default,
    pathMap: import("./PathMap").default,
    canvas: import("diagram-js/lib/core/Canvas").default,
    textRenderer: import("./TextRenderer").default,
    priority?: number,
  );

  handlers: {
    "bpmn:Event": (
      parentGfx: any,
      element: any,
      attrs: any,
    ) => SVGCircleElement;
    "bpmn:StartEvent": (parentGfx: any, element: any, options: any) => any;
    "bpmn:MessageEventDefinition": (
      parentGfx: any,
      element: any,
      isThrowing: any,
    ) => SVGPathElement;
    "bpmn:TimerEventDefinition": (
      parentGfx: any,
      element: any,
    ) => SVGCircleElement;
    "bpmn:EscalationEventDefinition": (
      parentGfx: any,
      event: any,
      isThrowing: any,
    ) => SVGPathElement;
    "bpmn:ConditionalEventDefinition": (
      parentGfx: any,
      event: any,
    ) => SVGPathElement;
    "bpmn:LinkEventDefinition": (
      parentGfx: any,
      event: any,
      isThrowing: any,
    ) => SVGPathElement;
    "bpmn:ErrorEventDefinition": (
      parentGfx: any,
      event: any,
      isThrowing: any,
    ) => SVGPathElement;
    "bpmn:CancelEventDefinition": (
      parentGfx: any,
      event: any,
      isThrowing: any,
    ) => SVGPathElement;
    "bpmn:CompensateEventDefinition": (
      parentGfx: any,
      event: any,
      isThrowing: any,
    ) => SVGPathElement;
    "bpmn:SignalEventDefinition": (
      parentGfx: any,
      event: any,
      isThrowing: any,
    ) => SVGPathElement;
    "bpmn:MultipleEventDefinition": (
      parentGfx: any,
      event: any,
      isThrowing: any,
    ) => SVGPathElement;
    "bpmn:ParallelMultipleEventDefinition": (
      parentGfx: any,
      event: any,
    ) => SVGPathElement;
    "bpmn:EndEvent": (parentGfx: any, element: any, options: any) => any;
    "bpmn:TerminateEventDefinition": (
      parentGfx: any,
      element: any,
    ) => SVGCircleElement;
    "bpmn:IntermediateEvent": (
      parentGfx: any,
      element: any,
      options: any,
    ) => any;
    "bpmn:IntermediateCatchEvent": (
      parentGfx: any,
      element: any,
      options: any,
    ) => any;
    "bpmn:IntermediateThrowEvent": (
      parentGfx: any,
      element: any,
      options: any,
    ) => any;
    "bpmn:Activity": (
      parentGfx: any,
      element: any,
      attrs: any,
    ) => SVGRectElement;
    "bpmn:Task": (parentGfx: any, element: any) => any;
    "bpmn:ServiceTask": (parentGfx: any, element: any) => any;
    "bpmn:UserTask": (parentGfx: any, element: any) => any;
    "bpmn:ManualTask": (parentGfx: any, element: any) => any;
    "bpmn:SendTask": (parentGfx: any, element: any) => any;
    "bpmn:ReceiveTask": (parentGfx: any, element: any) => any;
    "bpmn:ScriptTask": (parentGfx: any, element: any) => any;
    "bpmn:BusinessRuleTask": (parentGfx: any, element: any) => any;
    "bpmn:SubProcess": (parentGfx: any, element: any, attrs: any) => any;
    "bpmn:AdHocSubProcess": (parentGfx: any, element: any) => any;
    "bpmn:Transaction": (parentGfx: any, element: any) => any;
    "bpmn:CallActivity": (parentGfx: any, element: any) => any;
    "bpmn:Participant": (parentGfx: any, element: any) => any;
    "bpmn:Lane": (parentGfx: any, element: any, attrs: any) => SVGRectElement;
    "bpmn:InclusiveGateway": (parentGfx: any, element: any) => any;
    "bpmn:ExclusiveGateway": (parentGfx: any, element: any) => any;
    "bpmn:ComplexGateway": (parentGfx: any, element: any) => any;
    "bpmn:ParallelGateway": (parentGfx: any, element: any) => any;
    "bpmn:EventBasedGateway": (parentGfx: any, element: any) => any;
    "bpmn:Gateway": (parentGfx: any, element: any) => SVGPolygonElement;
    "bpmn:SequenceFlow": (parentGfx: any, element: any) => SVGElement;
    "bpmn:Association": (
      parentGfx: any,
      element: any,
      attrs: any,
    ) => SVGElement;
    "bpmn:DataInputAssociation": (parentGfx: any, element: any) => any;
    "bpmn:DataOutputAssociation": (parentGfx: any, element: any) => any;
    "bpmn:MessageFlow": (parentGfx: any, element: any) => SVGElement;
    "bpmn:DataObject": (parentGfx: any, element: any) => SVGPathElement;
    "bpmn:DataObjectReference": (
      parentGfx: any,
      element: any,
      options: any,
    ) => any;
    "bpmn:DataInput": (parentGfx: any, element: any) => any;
    "bpmn:DataOutput": (parentGfx: any, element: any) => any;
    "bpmn:DataStoreReference": (parentGfx: any, element: any) => SVGPathElement;
    "bpmn:BoundaryEvent": (parentGfx: any, element: any, options: any) => any;
    "bpmn:Group": (parentGfx: any, element: any) => SVGRectElement;
    label: (parentGfx: any, element: any) => SVGElement;
    "bpmn:TextAnnotation": (parentGfx: any, element: any) => SVGRectElement;
    "bt:Token": (parentGfx: any, element: any) => SVGRectElement; // TODO: Token
    "bt:ProcessSnapshot": (parentGfx: any, element: any) => SVGRectElement; // TODO: ProcessSnapshot
    ParticipantMultiplicityMarker: (parentGfx: any, element: any) => void;
    SubProcessMarker: (parentGfx: any, element: any) => void;
    ParallelMarker: (parentGfx: any, element: any, position: any) => void;
    SequentialMarker: (parentGfx: any, element: any, position: any) => void;
    CompensationMarker: (parentGfx: any, element: any, position: any) => void;
    LoopMarker: (parentGfx: any, element: any, position: any) => void;
    AdhocMarker: (parentGfx: any, element: any, position: any) => void;
  };

  /**
   * @param element
   *
   * @return
   */
  canRender(element: Element): boolean;

  /**
   * Draw shape into parentGfx.
   *
   * @param parentGfx
   * @param element
   *
   * @return mainGfx
   */
  drawShape(parentGfx: SVGElement, element: Element): SVGElement;

  /**
   * Draw connection into parentGfx.
   *
   * @param parentGfx
   * @param element
   *
   * @return mainGfx
   */
  drawConnection(parentGfx: SVGElement, element: Element): SVGElement;

  /**
   * Get shape path.
   *
   * @param element
   *
   * @return path
   */
  getShapePath(element: Element): string;
}

export type BpmnRendererConfig = Partial<{
  defaultFillColor: string;
  defaultStrokeColor: string;
  defaultLabelColor: string;
}>;

type Element = import("../model/Types").Element;
import BaseRenderer from "diagram-js/lib/draw/BaseRenderer";
