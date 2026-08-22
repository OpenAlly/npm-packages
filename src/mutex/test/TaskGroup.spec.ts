// Import Node.js Dependencies
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import timers from "node:timers/promises";

// Import Internal Dependencies
import { TaskGroup, Mutex, type TaskFailure } from "../src/index.ts";

describe("TaskGroup", () => {
  it("should run every scheduled task and wait for them on drain", async() => {
    const tasks = new TaskGroup();
    const completed: string[] = [];

    for (const name of ["one", "two", "three"]) {
      tasks.add(name, async() => {
        await timers.setTimeout(1);
        completed.push(name);
      });
    }

    assert.strictEqual(completed.length, 0);
    await tasks.drain();

    assert.deepStrictEqual(completed.sort(), ["one", "three", "two"]);
    assert.strictEqual(tasks.pendingCount, 0);
  });

  it("should release settled tasks so pendingCount does not grow", async() => {
    const tasks = new TaskGroup();

    for (let i = 0; i < 10; i++) {
      tasks.add(`task-${i}`, async() => void await timers.setTimeout(1));
    }
    assert.strictEqual(tasks.pendingCount, 10);

    await tasks.drain();
    assert.strictEqual(tasks.pendingCount, 0);
  });

  it("should hand over the collected failures on drain instead of discarding them", async() => {
    const tasks = new TaskGroup();
    const boom = new Error("boom");

    tasks.add("ok", async() => void await timers.setTimeout(1));
    tasks.add("ko", () => Promise.reject(boom));

    const failures = await tasks.drain();

    assert.deepStrictEqual([...failures], [
      { name: "ko", error: boom }
    ]);
  });

  it("should clear the failures once drained, so they do not pile up", async() => {
    const tasks = new TaskGroup();

    tasks.add("ko", () => Promise.reject(new Error("boom")));
    assert.strictEqual((await tasks.drain()).length, 1);

    assert.deepStrictEqual(tasks.failures, []);
    assert.deepStrictEqual(await tasks.drain(), []);
  });

  it("should expose failures as a copy, so callers cannot mutate the internal state", async() => {
    const tasks = new TaskGroup();

    tasks.add("ko", () => Promise.reject(new Error("boom")));
    await timers.setTimeout(5);

    const snapshot = tasks.failures as TaskFailure[];
    snapshot.length = 0;

    assert.strictEqual(tasks.failures.length, 1);
  });

  it("should keep draining the remaining tasks when one of them rejects", async() => {
    const tasks = new TaskGroup();
    let completed = 0;

    tasks.add("ko", () => Promise.reject(new Error("boom")));
    for (let i = 0; i < 5; i++) {
      tasks.add(`ok-${i}`, async() => {
        await timers.setTimeout(1);
        completed++;
      });
    }

    const failures = await tasks.drain();

    assert.strictEqual(completed, 5);
    assert.strictEqual(failures.length, 1);
  });

  it("should never run more tasks than the concurrency of the given Mutex", async() => {
    const tasks = new TaskGroup({
      mutex: new Mutex({ concurrency: 2 })
    });
    let running = 0;
    let maxRunning = 0;

    for (let i = 0; i < 12; i++) {
      tasks.add(`task-${i}`, async() => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await timers.setTimeout(2);
        running--;
      });
    }

    await tasks.drain();

    assert.strictEqual(maxRunning, 2);
    assert.strictEqual(running, 0);
  });

  it("should release the concurrency slot of a rejected task", async() => {
    const tasks = new TaskGroup({
      mutex: new Mutex({ concurrency: 1 })
    });
    const completed: string[] = [];

    tasks.add("ko", () => Promise.reject(new Error("boom")));
    tasks.add("ok", async() => {
      await timers.setTimeout(1);
      completed.push("ok");
    });

    await tasks.drain();

    assert.deepStrictEqual(completed, ["ok"]);
    assert.strictEqual(tasks.pendingCount, 0);
  });

  it("should resolve drain right away when nothing was scheduled", async() => {
    const tasks = new TaskGroup();

    assert.deepStrictEqual(await tasks.drain(), []);
    assert.strictEqual(tasks.pendingCount, 0);
  });

  it("should also wait for the tasks added while draining", async() => {
    const tasks = new TaskGroup();
    const completed: string[] = [];

    tasks.add("parent", async() => {
      await timers.setTimeout(1);
      completed.push("parent");

      tasks.add("child", async() => {
        await timers.setTimeout(1);
        completed.push("child");
      });
    });

    await tasks.drain();

    assert.deepStrictEqual(completed, ["parent", "child"]);
    assert.strictEqual(tasks.pendingCount, 0);
  });

  it("should support being drained concurrently, handing the failures to a single caller", async() => {
    const tasks = new TaskGroup();

    tasks.add("ko", () => Promise.reject(new Error("boom")));
    tasks.add("ok", async() => void await timers.setTimeout(1));

    const [first, second] = await Promise.all([tasks.drain(), tasks.drain()]);

    assert.strictEqual(first.length + second.length, 1);
    assert.strictEqual(tasks.pendingCount, 0);
  });

  it("should share one concurrency budget between the groups using the same Mutex", async() => {
    const mutex = new Mutex({ concurrency: 3 });
    const groups = [
      new TaskGroup({ mutex }),
      new TaskGroup({ mutex })
    ];

    let running = 0;
    let maxRunning = 0;

    for (const [index, group] of groups.entries()) {
      for (let i = 0; i < 8; i++) {
        group.add(`group-${index}-task-${i}`, async() => {
          running++;
          maxRunning = Math.max(maxRunning, running);
          await timers.setTimeout(2);
          running--;
        });
      }
    }

    await Promise.all(groups.map((group) => group.drain()));

    assert.strictEqual(maxRunning, 3);
    assert.strictEqual(running, 0);
    assert.strictEqual(mutex.running, 0);
  });

  it("should expose the Mutex so it can be handed over to another group", async() => {
    const first = new TaskGroup({ mutex: new Mutex({ concurrency: 1 }) });
    const second = new TaskGroup({ mutex: first.mutex });

    assert.strictEqual(first.mutex, second.mutex);
    assert.strictEqual(second.mutex.concurrency, 1);
  });

  it("should drain automatically at the end of an 'await using' scope", async() => {
    const completed: string[] = [];
    let group: TaskGroup | undefined;

    {
      await using tasks = new TaskGroup();
      group = tasks;

      tasks.add("one", async() => {
        await timers.setTimeout(1);
        completed.push("one");
      });
      assert.deepStrictEqual(completed, []);
    }

    assert.deepStrictEqual(completed, ["one"]);
    assert.strictEqual(group.pendingCount, 0);
  });

  it("should record the error when the Mutex is canceled before the task runs", async() => {
    const mutex = new Mutex({ concurrency: 1 }).cancel();
    const tasks = new TaskGroup({ mutex });
    let executed = false;

    tasks.add("never", async() => void (executed = true));

    const [failure] = await tasks.drain();

    assert.strictEqual(executed, false);
    assert.strictEqual(failure.name, "never");
    assert.strictEqual((failure.error as Error).name, "MutexCanceledError");
  });

  it("should drain several groups at once and flatten their failures", async() => {
    const downloads = new TaskGroup();
    const uploads = new TaskGroup({ mutex: downloads.mutex });

    downloads.add("download-ok", async() => void await timers.setTimeout(1));
    downloads.add("download-ko", () => Promise.reject(new Error("download boom")));
    uploads.add("upload-ko", async() => {
      await timers.setTimeout(1);
      throw new Error("upload boom");
    });

    const failures = await TaskGroup.drain(downloads, uploads);

    assert.deepStrictEqual(
      failures.map(({ name }) => name).sort(),
      ["download-ko", "upload-ko"]
    );
    assert.strictEqual(downloads.pendingCount, 0);
    assert.strictEqual(uploads.pendingCount, 0);
    assert.deepStrictEqual(await TaskGroup.drain(downloads, uploads), []);
  });

  it("should resolve the static drain right away when no group is given", async() => {
    assert.deepStrictEqual(await TaskGroup.drain(), []);
  });
});
