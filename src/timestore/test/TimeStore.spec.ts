// Import Node.js Dependencies
import { EventEmitter, once } from "node:events";
import { describe, it } from "node:test";
import assert from "node:assert";
import * as timers from "node:timers/promises";

// Import Third-party Dependencies
import { faker } from "@faker-js/faker";
import { IteratorMatcher } from "iterator-matcher";
import * as sinon from "sinon";

// Import Internal Dependencies
import { TimeStore, tSv } from "../src/index";
import * as utils from "./utils";

describe("TimeStore", () => {
  it("should have two Symbols property attached to listen to events", () => {
    assert.equal(typeof TimeStore.Expired, "symbol");
    assert.equal(typeof TimeStore.Renewed, "symbol");

    assert.equal(TimeStore.Expired, Symbol.for("ExpiredTimeStoreEntry"));
    assert.equal(TimeStore.Renewed, Symbol.for("RenewedTimeStoreEntry"));
  });

  describe("constructor", () => {
    it("should extend from Node.js EventEmitter and have the same number of property descriptors", () => {
      const eeDescriptorsLength = Reflect.ownKeys(new EventEmitter()).length;
      const store = new TimeStore({ ttl: 1000 });

      assert.ok(store instanceof EventEmitter);
      assert.equal(
        Reflect.ownKeys(store).length,
        eeDescriptorsLength,
        "Should have the same number of property descriptor than a Node.js EventEmitter"
      );
    });

    it("should use the provided EventEmitter to broadcast events", async() => {
      const eventEmitter = new EventEmitter();
      const expectedIdentifier = "foobar";

      const store = new TimeStore({
        ttl: 100, eventEmitter, keepEventLoopAlive: true
      });
      store.add(expectedIdentifier);

      try {
        // @ts-ignore
        const [identifier] = await once(store, TimeStore.Expired, AbortSignal.timeout(500));
        assert.equal(identifier, expectedIdentifier);
      }
      finally {
        store.clear();
      }
    });

    it("should expire all identifiers on process 'exit' event if expireIdentifiersOnProcessExit options is enabled", async() => {
      const processExitStub = sinon.stub(process, "exit");
      const ttl = 100;

      try {
        const store = new TimeStore({
          ttl, expireIdentifiersOnProcessExit: true
        });
        const counter = new utils.EventEmitterCounter(store, TimeStore.Expired);

        const numberOfElements = 5;
        for (let id = 0; id < numberOfElements; id++) {
          store.add(faker.random.alpha(10));
        }
        setImmediate(() => process.exit(1));

        await timers.setTimeout(utils.safeTTL(ttl));

        assert.equal(counter.count, numberOfElements);
      }
      finally {
        processExitStub.restore();
      }
    });
  });

  describe("ttl", () => {
    it("should return the same TimeToLive value as provided in the constructor payload", () => {
      const ttl = Number(faker.random.numeric(4));
      const store = new TimeStore({ ttl });

      assert.equal(store.ttl, ttl);
    });

    it("should return ttl zero if no ttl is provided in the constructor", () => {
      const store = new TimeStore();

      assert.equal(store.ttl, 0);
    });
  });

  describe("get", () => {
    it("should add a new identifier and then getting it back with the same TTL", () => {
      const firedIdentifier = faker.random.alpha(10);
      const store = new TimeStore();
      store.add(firedIdentifier, { ttl: 10 });

      const result = store.get(firedIdentifier)!;
      assert.equal(typeof result.timestamp, "number");
      assert.equal(result.ttl, 10);
    });

    it("should return null if there is no identifier matching", () => {
      const firedIdentifier = faker.random.alpha(10);
      const store = new TimeStore();

      const result = store.get(firedIdentifier);
      assert.equal(result, null);
    });
  });

  describe("add", () => {
    it("should Expire one identifier after the given default TTL class time", async() => {
      const firedIdentifier = faker.random.alpha(10);
      const ttl = 100;

      const store = new TimeStore({ ttl });
      const counter = new utils.EventEmitterCounter(store, TimeStore.Expired);

      setImmediate(() => store.add(firedIdentifier));
      await timers.setTimeout(utils.safeTTL(ttl));

      assert.equal(counter.count, 1);
    });

    it("should Expire two identifiers with custom TTL not matching the TimeStore one", async() => {
      const [firstId, secondId] = [faker.random.alpha(10), faker.random.alpha(10)];
      const ttl = 100;

      const store = new TimeStore({ ttl });
      const counter = new utils.EventEmitterCounter(store, TimeStore.Expired);

      store
        .add(secondId, { ttl: 400 })
        .add(firstId, { ttl: 200 });

      await timers.setTimeout(utils.safeTTL(ttl));
      assert.equal(counter.count, 0);

      await timers.setTimeout(500);
      assert.equal(counter.count, 2);

      const { isMatching } = new IteratorMatcher()
        .expect(firstId)
        .expect(secondId)
        .execute(counter.identifiers(), { allowNoMatchingValues: false });
      assert.equal(isMatching, true);
    });

    it("should Expire identifiers with mixed custom/default TTL", async() => {
      const [firstId, secondId] = [
        faker.random.alpha(10),
        faker.random.alpha(10)
      ];
      const ttl = 500;

      const store = new TimeStore({ ttl });
      const counter = new utils.EventEmitterCounter(store, TimeStore.Expired);

      store
        .add(secondId)
        .add(firstId, { ttl: 200 });

      await timers.setTimeout(utils.safeTTL(200));
      assert.equal(counter.count, 1);

      await timers.setTimeout(1000);
      assert.equal(counter.count, 2);

      const { isMatching } = new IteratorMatcher()
        .expect(firstId)
        .expect(secondId)
        .execute(counter.identifiers(), { allowNoMatchingValues: false });
      assert.equal(isMatching, true, "identifiers must be in the right order");
    });

    it("should Renew a given identifier before it expire and then reset it's internal TTL", async() => {
      const firedIdentifier = faker.random.alpha(10);
      const eventEmitter = new EventEmitter();
      const ttl = 200;

      const store = new TimeStore({ ttl, eventEmitter });
      const customEECounter = new utils.EventEmitterCounter(eventEmitter, TimeStore.Renewed);
      const counter = new utils.EventEmitterCounter(store, [
        TimeStore.Expired,
        TimeStore.Renewed
      ]);

      store.add(firedIdentifier);
      setTimeout(() => store.add(firedIdentifier), ttl - 10);
      await timers.setTimeout(utils.safeTTL(ttl * 2));

      assert.equal(counter.count, 2);
      assert.equal(customEECounter.count, 1);

      const { isMatching } = new IteratorMatcher()
        .expect(TimeStore.Renewed)
        .expect(TimeStore.Expired)
        .execute(counter.events(), { allowNoMatchingValues: false });
      assert.equal(isMatching, true);
    });

    it("should not expire if no ttl is provided in the constructor", async() => {
      const store = new TimeStore();
      const counter = new utils.EventEmitterCounter(store, [
        TimeStore.Renewed
      ]);

      store.add("foo");
      await timers.setTimeout(100);
      store.add("foo");

      const { isMatching } = new IteratorMatcher()
        .expect(TimeStore.Renewed)
        .execute(counter.events(), { allowNoMatchingValues: false });
      assert.ok(isMatching);
    });

    it("should renew and make expire a given identifier that didn't had any ttl", async() => {
      const store = new TimeStore();
      const counter = new utils.EventEmitterCounter(store, [
        TimeStore.Renewed,
        TimeStore.Expired
      ]);

      store.add("foo");
      store.add("foo", { ttl: 10 });
      await timers.setTimeout(100);

      const { isMatching } = new IteratorMatcher()
        .expect(TimeStore.Renewed)
        .expect(TimeStore.Expired)
        .execute(counter.events(), { allowNoMatchingValues: false });
      assert.ok(isMatching);
    });

    it("should keep the original identifier TTL when we renew it with keepIdentifierBirthTTL equal true", async() => {
      const store = new TimeStore({ ttl: 50 });
      const counter = new utils.EventEmitterCounter(store, [
        TimeStore.Renewed,
        TimeStore.Expired
      ]);

      store.add("foo");
      store.add("foo", { ttl: 500, keepIdentifierBirthTTL: true });
      await timers.setTimeout(100);

      const { isMatching } = new IteratorMatcher()
        .expect(TimeStore.Renewed)
        .expect(TimeStore.Expired)
        .execute(counter.events(), { allowNoMatchingValues: false });
      assert.ok(isMatching);
    });
  });

  describe("addTsv", () => {
    it("should Expire one identifier after the given default TTL class time", async() => {
      const ttl = 100;
      const firedIdentifier = tSv({ ttl })(faker.random.alpha(10));

      const store = new TimeStore({ ttl });
      const counter = new utils.EventEmitterCounter(store, TimeStore.Expired);

      setImmediate(() => store.addTsv(firedIdentifier));
      await timers.setTimeout(utils.safeTTL(ttl));

      assert.equal(counter.count, 1);
    });

    it("should return the instance of the class as a response (A.K.A this)", () => {
      const store = new TimeStore({ ttl: 100 });

      const storeBis = store.addTsv(tSv()("foo"));
      store.clear();

      assert.equal(store, storeBis);
    });
  });

  describe("clear", () => {
    it("should clear all registered identifiers and clear the inner store Node.js timeout", async() => {
      const store = new TimeStore({ ttl: 500 });
      const counter = new utils.EventEmitterCounter(store, [
        TimeStore.Expired,
        TimeStore.Renewed
      ]);

      store
        .add(faker.random.alpha(5))
        .add(faker.random.alpha(5));
      setImmediate(() => store.clear());

      await timers.setTimeout(1_000);
      assert.equal(counter.count, 0);
    });

    it("should return itself (same instance of object A.K.A this)", () => {
      const store = new TimeStore({ ttl: 500 });

      assert.equal(store.clear(), store);
    });
  });

  describe("delete", () => {
    it("should delete the first identifier and reschedule the timeout second one", async() => {
      const expectedIdentifier = faker.random.alpha(10);
      const toDeleteIdentifier = faker.random.alpha(10);
      const ttl = 500;

      const store = new TimeStore({ ttl, keepEventLoopAlive: true });
      const counter = new utils.EventEmitterCounter(store, [
        TimeStore.Expired,
        TimeStore.Renewed
      ]);

      store
        .add(toDeleteIdentifier, { ttl: 200 })
        .add(expectedIdentifier);
      setTimeout(() => store.delete(toDeleteIdentifier), 100);

      try {
        // @ts-ignore
        const [identifier] = await once(store, TimeStore.Expired, AbortSignal.timeout(utils.safeTTL(ttl)));

        assert.equal(identifier, expectedIdentifier);
        assert.equal(counter.count, 1);
      }
      finally {
        store.clear();
      }
    });

    it("should return itself (same instance of object A.K.A this)", () => {
      const store = new TimeStore({ ttl: 500 });

      assert.equal(store.delete("foobar"), store);
      store.clear();
    });
  });

  describe("size", () => {
    it("should return the TimeStore.identifiers size", () => {
      const store = new TimeStore();
      assert.equal(store.size, 0);

      store.add("random");
      assert.equal(store.size, 1);

      store.clear();
      assert.equal(store.size, 0);
    });
  });

  describe("has", () => {
    it("should return 'true' if the key exists", () => {
      const store = new TimeStore();

      store.add("random");
      assert.ok(store.has("random"));
    });

    it("should return 'false' if the key does not exist", () => {
      const store = new TimeStore();

      assert.equal(store.has("random"), false);
    });
  });
});
