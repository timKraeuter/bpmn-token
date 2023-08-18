/**
 * BPMN specific behavior ensuring that bpmndi:Label's dc:Bounds are removed
 * when shape is resized.
 *
 */
export default class RemoveEmbeddedLabelBoundsBehavior extends CommandInterceptor {
  /**
   * @param eventBus
   * @param modeling
   */
  constructor(eventBus: EventBus, modeling: Modeling);
}

type EventBus = import("diagram-js/lib/core/EventBus").default;
type Modeling = import("../Modeling").default;
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
