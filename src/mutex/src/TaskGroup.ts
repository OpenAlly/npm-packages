// Import Internal Dependencies
import { Mutex } from "./Mutex.ts";

export interface TaskGroupOptions {
  /**
   * Mutex that limits concurrent tasks.
   * Share one across groups for a shared limit.
   *
   * @default new Mutex({ concurrency: Mutex.MaximumConcurrency })
   */
  mutex?: Mutex;
}

export interface TaskFailure {
  name: string;
  error: unknown;
}

/**
 * Runs fire-and-forget tasks through a Mutex.
 * drain() waits for pending tasks and returns their failures without rejecting.
 *
 * @example
 * await using tasks = new TaskGroup();
 * tasks.add("fetch-user", () => fetch(url));
 */
export class TaskGroup {
  /**
   * Drains every given group in parallel and returns their failures flattened.
   * Groups sharing a Mutex are safe to drain this way, no group waits for another.
   *
   * @example
   * const failures = await TaskGroup.drain(downloads, uploads);
   */
  static async drain(
    ...groups: TaskGroup[]
  ): Promise<readonly TaskFailure[]> {
    const failures = await Promise.all(
      groups.map((group) => group.drain())
    );

    return failures.flat();
  }

  #pending = new Set<Promise<void>>();
  #failures: TaskFailure[] = [];
  #mutex: Mutex;

  constructor(
    options: TaskGroupOptions = {}
  ) {
    const {
      mutex = new Mutex({
        concurrency: Mutex.MaximumConcurrency
      })
    } = options;

    this.#mutex = mutex;
  }

  get mutex(): Mutex {
    return this.#mutex;
  }

  get pendingCount(): number {
    return this.#pending.size;
  }

  get failures(): readonly TaskFailure[] {
    return [...this.#failures];
  }

  add(
    name: string,
    task: () => Promise<unknown>
  ): void {
    const pending: Promise<void> = this.#run(name, task).finally(
      () => this.#pending.delete(pending)
    );

    this.#pending.add(pending);
  }

  async drain(): Promise<readonly TaskFailure[]> {
    while (this.#pending.size > 0) {
      await Promise.all(this.#pending);
    }

    return this.#failures.splice(0);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.drain();
  }

  async #run(
    name: string,
    task: () => Promise<unknown>
  ): Promise<void> {
    try {
      using _ = await this.#mutex.acquire();

      await task();
    }
    catch (error) {
      this.#failures.push({ name, error });
    }
  }
}
