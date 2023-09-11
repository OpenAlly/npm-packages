// Import Node.js Dependencies
import { EventEmitter } from "node:events";

type eventKey = string | symbol;

export class EventEmitterCounter {
  #counter = 0;
  #keys: eventKey[] = [];
  #identifiers: any[] = [];

  constructor(ee: EventEmitter, events: eventKey | eventKey[]) {
    const eeArr = Array.isArray(events) ? events : [events];

    for (const event of eeArr) {
      ee.on(event, (identifier) => {
        this.#counter++;
        this.#keys.push(event);
        this.#identifiers.push(identifier);
      });
    }
  }

  * events() {
    yield* this.#keys;
  }

  * identifiers() {
    yield* this.#identifiers;
  }

  get count() {
    return this.#counter;
  }
}

export function safeTTL(ttl: number) {
  return ttl + (ttl / 5);
}
