/* eslint-disable max-nested-callbacks */

// Import Node.js Dependencies
import { EventEmitter, once } from "node:events";
import * as timers from "node:timers/promises";

// Import Third-party Dependencies
import { expect } from "chai";
import { faker } from "@faker-js/faker";
import { IteratorMatcher } from "iterator-matcher";
import * as sinon from "sinon";

// Import Internal Dependencies
import { TimeStore } from "../src/index";
import * as utils from "./utils";

describe("TimeStore", () => {
  it("should have two Symbols property attached to listen to events", () => {
    expect(TimeStore.Expired).to.be.an("symbol");
    expect(TimeStore.Renewed).to.be.an("symbol");

    expect(TimeStore.Expired).to.equal(Symbol.for("ExpiredTimeStoreEntry"));
    expect(TimeStore.Renewed).to.equal(Symbol.for("RenewedTimeStoreEntry"));
  });

  describe("constructor", () => {
    it("should extend from Node.js EventEmitter and have the same number of property descriptors", () => {
      const eeDescriptorsLength = Reflect.ownKeys(new EventEmitter()).length;
      const store = new TimeStore({ ttl: 1000 });

      expect(store).to.be.instanceof(EventEmitter);
      expect(Reflect.ownKeys(store).length).to.equal(
        eeDescriptorsLength,
        "Should have the same number of property descriptor than a Node.js EventEmitter"
      );
    });

    it("should use the provided EventEmitter to broadcast events", async() => {
      const eventEmitter = new EventEmitter();
      const expectedIdentifier = "foobar";

      const store = new TimeStore({
        ttl: 100, eventEmitter
      });
      store.add(expectedIdentifier);

      // @ts-ignore
      const [identifier] = await once(store, TimeStore.Expired, AbortSignal.timeout(500));
      expect(identifier).to.equal(expectedIdentifier);
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

        expect(counter.count).to.equal(numberOfElements);
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

      expect(store.ttl).to.equal(ttl);
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

      expect(counter.count).to.equal(1);
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
      expect(counter.count).to.equal(0);

      await timers.setTimeout(500);
      expect(counter.count).to.equal(2);

      const { isMatching } = new IteratorMatcher()
        .expect(firstId)
        .expect(secondId)
        .execute(counter.identifiers(), { allowNoMatchingValues: false });
      expect(isMatching).to.equal(true);
    });

    it("should Expire identifiers with mixed custom/default TTL", async() => {
      const [firstId, secondId, thirdId] = [
        faker.random.alpha(10),
        faker.random.alpha(10),
        faker.random.alpha(10)
      ];
      const ttl = 500;

      const store = new TimeStore({ ttl });
      const counter = new utils.EventEmitterCounter(store, TimeStore.Expired);

      store
        .add(secondId)
        .add(thirdId)
        .add(firstId, { ttl: 200 });

      await timers.setTimeout(utils.safeTTL(200));
      expect(counter.count).to.equal(1);

      await timers.setTimeout(1000);
      expect(counter.count).to.equal(3);

      const { isMatching } = new IteratorMatcher()
        .expect(firstId)
        .expect(secondId)
        .expect(thirdId)
        .execute(counter.identifiers(), { allowNoMatchingValues: false });
      expect(isMatching).to.equal(true);
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

      expect(counter.count).to.equal(2);
      expect(customEECounter.count).to.equal(1);

      const { isMatching } = new IteratorMatcher()
        .expect(TimeStore.Renewed)
        .expect(TimeStore.Expired)
        .execute(counter.events(), { allowNoMatchingValues: false });
      expect(isMatching).to.equal(true);
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
      expect(counter.count).to.equal(0);
    });

    it("should return itself (same instance of object A.K.A this)", () => {
      const store = new TimeStore({ ttl: 500 });

      expect(store.clear()).to.equal(store);
    });
  });

  describe("delete", () => {
    it("should delete the first identifier and reschedule the timeout second one", async() => {
      const expectedIdentifier = faker.random.alpha(10);
      const toDeleteIdentifier = faker.random.alpha(10);
      const ttl = 500;

      const store = new TimeStore({ ttl });
      const counter = new utils.EventEmitterCounter(store, [
        TimeStore.Expired,
        TimeStore.Renewed
      ]);

      store
        .add(toDeleteIdentifier, { ttl: 200 })
        .add(expectedIdentifier);
      setTimeout(() => store.delete(toDeleteIdentifier), 100);

      // @ts-ignore
      const [identifier] = await once(store, TimeStore.Expired, AbortSignal.timeout(utils.safeTTL(ttl)));

      expect(identifier).to.equal(expectedIdentifier);
      expect(counter.count).to.equal(1);
    });

    it("should return itself (same instance of object A.K.A this)", () => {
      const store = new TimeStore({ ttl: 500 });

      expect(store.delete("foobar")).to.equal(store);
    });
  });
});
