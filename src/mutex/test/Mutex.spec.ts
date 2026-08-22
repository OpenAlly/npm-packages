// Import Node.js Dependencies
import { describe, it } from "node:test";
import { once } from "node:events";
import timers from "node:timers/promises";
import assert from "node:assert/strict";

// Import Internal Dependencies
import {
  Mutex,
  MutexRelease,
  MutexCanceledError
} from "../src/index.ts";

describe("Mutex", () => {
  describe("constructor", () => {
    it("should assert that default properties are initialized with the right default values", () => {
      const mu = new Mutex();

      assert.strictEqual(mu.concurrency, 5, "Default maximum concurrent request is 5");
      assert.strictEqual(mu.locked, false);
      assert.strictEqual(mu.running, 0);
    });

    it("should return concurrency equal one if we provide a negative number for concurrency option", () => {
      const mu = new Mutex({ concurrency: -10 });

      assert.strictEqual(mu.concurrency, 1);
    });

    it("should return concurrency equal one if we provide zero for concurrency option", () => {
      const mu = new Mutex({ concurrency: 0 });

      assert.strictEqual(mu.concurrency, 1);
    });

    it("should clamp the concurrency to the Maximum allowed value", () => {
      const mu = new Mutex({
        concurrency: Mutex.MaximumConcurrency + 100
      });

      assert.strictEqual(mu.concurrency, Mutex.MaximumConcurrency);
    });
  });

  describe("cancel", () => {
    it("should throw if trying to acquire when Mutex instance has been cancelled", async() => {
      const mu = new Mutex().cancel();
      assert.strictEqual(mu.running, 0);

      await assert.rejects(mu.acquire(), {
        name: "MutexCanceledError",
        message: "Mutex Canceled (API)"
      });
    });

    it("should reject all lock (promises) waiting to be acquired", async() => {
      let released = false;
      const mu = new Mutex({ concurrency: 1 });
      mu.once(MutexRelease, () => (released = true));

      const free = await mu.acquire();
      setImmediate(() => mu.cancel());

      await assert.rejects(mu.acquire(), {
        name: "MutexCanceledError",
        message: "Mutex Canceled (API)"
      });
      assert.strictEqual(mu.running, 0);

      free();
      assert.strictEqual(released, false);
    });
  });

  describe("reset", () => {
    it("should reset Mutex instance and remove cancellation", async() => {
      const mu = new Mutex().cancel().reset();
      assert.strictEqual(mu.running, 0);

      const free = await mu.acquire();
      assert.strictEqual(mu.running, 1);
      free();

      assert.strictEqual(mu.running, 0);
    });

    it("should trigger cancel if there is promises waiting to be acquired", async() => {
      let released = false;
      const mu = new Mutex({ concurrency: 1 });
      mu.once(MutexRelease, () => (released = true));

      const free = await mu.acquire();
      setImmediate(() => mu.reset());

      await assert.rejects(mu.acquire(), {
        name: "MutexCanceledError",
        message: "Mutex Canceled (API)"
      });
      assert.strictEqual(mu.running, 0);

      free();
      assert.strictEqual(released, false);
    });

    it("should reset the running count even when the Mutex is not locked", async() => {
      const mu = new Mutex({ concurrency: 5 });

      await mu.acquire();
      await mu.acquire();
      assert.strictEqual(mu.running, 2);
      assert.strictEqual(mu.locked, false);

      mu.reset();

      assert.strictEqual(mu.running, 0);
    });
  });

  describe("release", () => {
    it("should release acquired lock", async() => {
      const mu = new Mutex();

      await mu.acquire();
      assert.strictEqual(mu.running, 1);

      setImmediate(() => mu.release());
      await once(mu, MutexRelease, { signal: AbortSignal.timeout(100) });

      assert.strictEqual(mu.running, 0);
    });

    it("should release the promise waiting for lock acquisition", async() => {
      let releaseCount = 0;
      const mu = new Mutex({ concurrency: 1 });
      mu.on(MutexRelease, () => (releaseCount++));

      await mu.acquire();
      assert.strictEqual(mu.running, 1);
      setImmediate(() => mu.release());

      const free = await mu.acquire();
      assert.strictEqual(mu.running, 1);
      assert.strictEqual(releaseCount, 1);

      free();
      assert.strictEqual(mu.running, 0);
      assert.strictEqual(releaseCount, 2);
    });

    it("should release the acquired lock automatically when the lock leave the scope", async() => {
      const mu = new Mutex();

      {
        using _ = await mu.acquire();
        assert.strictEqual(mu.running, 1);
      }

      assert.strictEqual(mu.running, 0);
    });
  });

  describe("acquire", () => {
    it("should automatically release after a given delay (in milliseconds)", async() => {
      const mu = new Mutex({ concurrency: 1 });

      const free = await mu.acquire({
        delayBeforeAutomaticRelease: 10
      });
      await once(mu, MutexRelease, { signal: AbortSignal.timeout(10) });

      setImmediate(() => free());
      let released = false;
      mu.once(MutexRelease, () => (released = true));

      assert.strictEqual(released, false);
    });

    it("should assert that the Node.js timer behind delayBeforeAutomaticRelease options is properly cleared", async() => {
      let releaseCount = 0;
      const mu = new Mutex({ concurrency: 1 });
      mu.on(MutexRelease, () => (releaseCount++));

      const delayBeforeAutomaticRelease = 10;
      const free = await mu.acquire({
        delayBeforeAutomaticRelease
      });
      setImmediate(() => free());
      await once(mu, MutexRelease, { signal: AbortSignal.timeout(20) });
      await timers.setTimeout(delayBeforeAutomaticRelease * 2);

      assert.strictEqual(releaseCount, 1);
    });

    it("should throw with MutexCanceledError if abort signal is already aborted!", async() => {
      const mu = new Mutex({ concurrency: 1 });

      const ac = new AbortController();
      ac.abort();

      await assert.rejects(mu.acquire({ signal: ac.signal }), {
        name: "MutexCanceledError",
        message: "Mutex Canceled (AbortSignal)"
      });
    });

    it("should trigger AbortSignal if the waiting promise is not resolved under the expected delay", async() => {
      // NOTE: Forcing the event-loop to remain alive
      const timer = setTimeout(() => void 0, 100);

      try {
        const mu = new Mutex({ concurrency: 1 });
        const free = await mu.acquire();

        const signal = AbortSignal.timeout(10);
        await assert.rejects(mu.acquire({ signal }), {
          name: "MutexCanceledError",
          message: "Mutex Canceled (AbortSignal)"
        });

        free();
      }
      finally {
        clearTimeout(timer);
      }
    });

    it("should automatically releases lock as they are resolved over time", async() => {
      let releaseCount = 0;
      const mu = new Mutex({ concurrency: 2 });
      mu.on(MutexRelease, () => (releaseCount++));

      async function doTheWork() {
        const free = await mu.acquire();
        await timers.setTimeout(20);
        free();
      }

      await Promise.allSettled([
        doTheWork(),
        doTheWork(),
        doTheWork(),
        doTheWork(),
        doTheWork(),
        doTheWork(),
        doTheWork()
      ]);

      assert.strictEqual(releaseCount, 7);
    });

    it("should continue to work even if we release and abort signal at the same time", async() => {
      const mu = new Mutex({ concurrency: 1 });
      const ac = new AbortController();

      await mu.acquire();
      setImmediate(() => {
        mu.release();
        ac.abort();
      });

      const free = await mu.acquire({ signal: ac.signal });
      assert.strictEqual(mu.running, 1);

      setImmediate(() => free());
      await once(mu, MutexRelease, { signal: AbortSignal.timeout(10) });

      assert.strictEqual(mu.running, 0);
    });

    it("should keep the slot of the holder when a waiting acquisition is aborted", async() => {
      // NOTE: Forcing the event-loop to remain alive
      const timer = setTimeout(() => void 0, 100);

      try {
        const mu = new Mutex({ concurrency: 1 });
        const free = await mu.acquire();

        await assert.rejects(mu.acquire({ signal: AbortSignal.timeout(10) }), {
          name: "MutexCanceledError"
        });

        assert.strictEqual(mu.running, 1, "the holder is still holding its slot");
        assert.strictEqual(mu.locked, true);

        let released = false;
        mu.once(MutexRelease, () => (released = true));
        free();

        assert.strictEqual(released, true);
        assert.strictEqual(mu.running, 0);
      }
      finally {
        clearTimeout(timer);
      }
    });

    it("should ignore an abort landing after the slot has been handed over", async() => {
      const mu = new Mutex({ concurrency: 1 });
      const ac = new AbortController();

      await mu.acquire();
      const pending = mu.acquire({ signal: ac.signal });

      mu.release();
      ac.abort();

      const free = await pending;
      assert.strictEqual(mu.running, 1);

      free();
      assert.strictEqual(mu.running, 0);
    });

    it("should not release more than once when the same free is called twice", async() => {
      let releaseCount = 0;
      const mu = new Mutex({ concurrency: 2 });
      mu.on(MutexRelease, () => (releaseCount++));

      const free = await mu.acquire();
      await mu.acquire();
      assert.strictEqual(mu.running, 2);

      free();
      free();

      assert.strictEqual(mu.running, 1);
      assert.strictEqual(releaseCount, 1);
    });

    it("should unref the automatic release timer when keepReferencingTimers is disabled", async() => {
      const mu = new Mutex({
        concurrency: 1,
        keepReferencingTimers: false
      });

      const free = await mu.acquire({ delayBeforeAutomaticRelease: 10 });
      await once(mu, MutexRelease, { signal: AbortSignal.timeout(50) });

      assert.strictEqual(mu.running, 0);

      // NOTE: the automatic release already happened, so free() is a no-op
      free();
      assert.strictEqual(mu.running, 0);
    });
  });
});

describe("MutexCanceledError", () => {
  it("should extend Error", () => {
    const err = new MutexCanceledError();

    assert.ok(err instanceof Error);
    assert.strictEqual(err.name, "MutexCanceledError");
  });

  it("should throw having 'API' has default abort type", () => {
    assert.throws(() => {
      throw new MutexCanceledError();
    }, { message: "Mutex Canceled (API)" });
  });

  it("should throw with an abort type equal to 'AbortSignal'", () => {
    assert.throws(() => {
      throw new MutexCanceledError("AbortSignal");
    }, { message: "Mutex Canceled (AbortSignal)" });
  });

  it("should expose the abort type as a property", () => {
    assert.strictEqual(new MutexCanceledError().abortType, "API");
    assert.strictEqual(new MutexCanceledError("AbortSignal").abortType, "AbortSignal");
  });

  it("should expose an abort type of AbortSignal when a waiting acquisition is aborted", async() => {
    const mu = new Mutex({ concurrency: 1 });
    const ac = new AbortController();

    await mu.acquire();
    const pending = mu.acquire({ signal: ac.signal });
    ac.abort();

    const error = await pending.catch((err) => err);

    assert.ok(error instanceof MutexCanceledError);
    assert.strictEqual(error.abortType, "AbortSignal");
  });
});
