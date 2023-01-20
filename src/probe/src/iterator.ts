/* eslint-disable max-depth */

// Import Internal Dependencies
import { Probe } from "./probe.js";
import {
  IsolatedContext,
  isSignal,
  BREAK,
  SKIP,
  REWIND
} from "./context.js";

export interface IProbeIteratorOptions {
  errorMode?: "continue" | "break" | "error";
  aggregationStrategy?: any;
}

export class ProbeIterator {
  #probes: Map<string, Probe>;
  #skip = false;
  #breaks = {
    tags: new Set<string>(),
    probe: new Set<string>()
  };

  constructor(probes: Probe[]) {
    this.#probes = new Map(
      probes.map((probe) => [probe.name, probe])
    );
  }

  get skip() {
    return this.#skip;
  }

  walk(node: any, context: Record<string, any>) {
    this.#skip = false;
    const breaks = {
      tags: new Set<string>(),
      probe: new Set<string>()
    };
    const hasTag = (tag: string) => breaks.tags.has(tag) || this.#breaks.tags.has(tag);
    const hasProbe = (probeName: string) => breaks.probe.has(probeName) || this.#breaks.tags.has(probeName);

    topIteration: for (const [probeName, probe] of this.#probes) {
      console.log(`Running probe: ${probeName}`);
      if (probe.disabled) {
        continue;
      }

      const isolatedCtx = new IsolatedContext(
        context,
        probe.getInitialIsolateData()
      );

      if (!probe.scan(node, isolatedCtx)) {
        continue;
      }

      harvestIterator: while (true) {
        for (const data of probe.harvest(node, isolatedCtx)) {
          if (isSignal(data)) {
            switch (data.type) {
              case BREAK:
                break topIteration;
              case SKIP:
                // Finalize aggregation?

                return;
              case REWIND:
                // TODO: update isolatedCtx?

                continue harvestIterator;
              default:
                continue;
            }
          }

          // AGGREGATE ?
        }

        break;
      }
    }
  }
}
