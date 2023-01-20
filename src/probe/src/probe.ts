// Import Internal Dependencies
import { IsolatedContext, IsolatedSignal } from "./context.js";

export interface IProbeOptions<IsolateContextDataType> {
  /**
   * Name of the probe, useful for internal features such as;
   * - debugging
   * - disabling probe execution by name (instead of tag)
   */
  name: string;

  /**
   * Assign a list of tags that will be used to customize the breaking mechanism
   */
  tags?: string[];

  /**
   * If enabled it will break the iterator when the probe is matching
   * > Note: matching mean the scan() method returned true
   *
   * @default false
   */
  breakIfMatching?: boolean;

  /**
   * If enabled it aggregate data as the harvest progresses.
   * It is recommended to disable it when using rewind() signal.
   *
   * @default true
   */
  forceLazyAggregation?: boolean;

  /**
   * Callback to initialize the IsolateContext data.
   * This function is triggered every iteration/probe execution.
   */
  initialIsolateContextData?: () => IsolateContextDataType;
}

export abstract class Probe<
  EstreeNode = any,
  HarvestedData = any,
  GlobalContextData = any,
  IsolateContextDataType = null
> {
  #name: string;
  #breakIfMatching: boolean;
  #tags: Set<string>;
  #disabled = false;
  #initialIsolateContextData: () => IsolateContextDataType;

  constructor(options: IProbeOptions<IsolateContextDataType>) {
    const {
      name,
      breakIfMatching = false,
      tags = [],
      initialIsolateContextData
    } = options;

    this.#name = name;
    this.#breakIfMatching = breakIfMatching;
    this.#tags = new Set(tags);
    this.#initialIsolateContextData = initialIsolateContextData ??
      (() => null) as () => IsolateContextDataType;
  }

  get name() {
    return this.#name;
  }

  get breakIfMatching() {
    return this.#breakIfMatching;
  }

  get disabled() {
    return this.#disabled;
  }

  getInitialIsolateData() {
    return this.#initialIsolateContextData();
  }

  disable() {
    this.#disabled = true;
  }

  hasTag(tagName: string): boolean {
    return this.#tags.has(tagName);
  }

  /**
   * Scan a given Estree Node.
   *
   * If it return true, the runner will proceed to the harvesting
   * If it return false, the runner will continue to iterate on the probes list
   */
  abstract scan(
    node: EstreeNode,
    ctx: IsolatedContext<GlobalContextData, IsolateContextDataType>
  ): boolean;

  /**
   * Harvest data by walking on the given Estree Node
   */
  abstract harvest(
    node: EstreeNode,
    ctx: IsolatedContext<GlobalContextData, IsolateContextDataType>
  ): IterableIterator<HarvestedData | IsolatedSignal>;
}
