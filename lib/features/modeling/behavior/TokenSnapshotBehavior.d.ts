export default class TokenSnapshotBehavior extends CommandInterceptor {
  /**
   * @param eventBus
   * @param modeling
   */
  constructor(eventBus: EventBus, modeling: Modeling);
}

type EventBus = import("diagram-js/lib/core/EventBus").default;
type Modeling = import("../../modeling/Modeling").default;
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
