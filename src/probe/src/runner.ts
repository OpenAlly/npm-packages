/* eslint-disable max-depth */

// Import Internal Dependencies
import { Probe } from "./probe.js";
import {
  IsolatedContext,
  // isSignal,
  BREAK,
  // SKIP,
  REWIND
} from "./context.js";

export interface IProbeRunnerOptions {
  errorMode?: "continue" | "break" | "error";
  aggregationStrategy?: any;
}

export class ProbeRunner<GlobalContext extends Record<string, any> = any> {
  #context: GlobalContext;

  #probes: Map<string, Probe>;
  #skip = false;
  #breaks = Object.freeze({
    tags: initBreakSets(), probe: initBreakSets()
  });

  constructor(probes: Probe[], context: GlobalContext) {
    this.#probes = new Map(
      probes.map((probe) => [probe.name, probe])
    );
    this.#context = context;
  }

  get skip() {
    return this.#skip;
  }

  clear() {
    this.#skip = false;

    this.#breaks.tags.local.clear();
    this.#breaks.probe.local.clear();
  }

  private* iterateProbes(node: any) {
    probesLoop: for (const [, probe] of this.#probes) {
      if (probe.disabled) {
        continue;
      }

      const isolatedCtx = new IsolatedContext(
        this.#context,
        probe.getInitialIsolateData()
      );

      if (!probe.scan(node, isolatedCtx)) {
        continue;
      }

      rewindLoop: while (true) {
        for (const data of probe.harvest(node, isolatedCtx)) {
          const signal = yield data;
          console.log("signal: ", signal);
          if (signal === BREAK) {
            break probesLoop;
          }
          if (signal === REWIND) {
            continue rewindLoop;
          }
        }
        console.log("breaking rewind loop");

        break;
      }
    }
  }

  walk(node: any) {
    this.clear();

    const it = this.iterateProbes(node);
    console.log(it.next());
    console.log(it.next());
    // console.log(it.next(REWIND));
    // console.log(it.next(BREAK));
    // console.log(it.next());


    // if (isSignal(data)) {
    //   switch (data.type) {
    //     case BREAK:
    //       break topIteration;
    //     case SKIP:
    //       // Finalize aggregation?

    //       return;
    //     case REWIND:
    //       // TODO: update isolatedCtx?

    //       continue harvestIterator;
    //     default:
    //       continue;
    //   }
    // }
  }
}

function initBreakSets() {
  return Object.freeze({
    local: new Set<string>(),
    global: new Set<string>()
  });
}
