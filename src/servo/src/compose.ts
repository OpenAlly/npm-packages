// Import Internal Dependencies
import { pass } from "./respond.ts";
import type { ServoHandler } from "./types.ts";

/**
 * Chains handlers: each one's `next` runs the following handler. After the
 * last one, the outer `next` is called, or a 404 is sent when there is none.
 */
export function compose(
  ...handlers: ServoHandler[]
): ServoHandler {
  return function composedHandler(req, res, next) {
    let index = 0;

    function step(): void {
      const handler = handlers[index++];
      if (handler === undefined) {
        pass(res, next);
      }
      else {
        handler(req, res, step);
      }
    }

    step();
  };
}
