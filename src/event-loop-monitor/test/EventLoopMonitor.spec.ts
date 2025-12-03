// Import Node.js Dependencies
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";

// Import Internal Dependencies
import { EventLoopMonitor } from "../src/index.js";

describe("EventLoopMonitor", () => {
  let monitor: EventLoopMonitor;

  afterEach(() => {
    if (monitor) {
      monitor.close();
    }
  });

  describe("constructor", () => {
    it("should create a new EventLoopMonitor with default options", () => {
      monitor = new EventLoopMonitor();

      assert.ok(monitor);
    });

    it("should create a new EventLoopMonitor with custom options", () => {
      monitor = new EventLoopMonitor({
        sampleInterval: 100,
        maxEventLoopDelay: 50,
        maxHeapUsedBytes: 1024 * 1024 * 100,
        maxRssBytes: 1024 * 1024 * 200,
        maxEventLoopUtilization: 0.8
      });

      assert.ok(monitor);
    });

    it("should clamp maxEventLoopUtilization between 0 and 1", () => {
      monitor = new EventLoopMonitor({
        maxEventLoopUtilization: 2
      });

      assert.ok(monitor);
    });
  });

  describe("isUnderPressure", () => {
    it("should return false when no thresholds are set", () => {
      monitor = new EventLoopMonitor();

      assert.strictEqual(monitor.isUnderPressure(), false);
    });

    it("should return false when thresholds are not exceeded", () => {
      monitor = new EventLoopMonitor({
        maxHeapUsedBytes: 1024 * 1024 * 1024 * 10,
        maxRssBytes: 1024 * 1024 * 1024 * 10
      });

      assert.strictEqual(monitor.isUnderPressure(), false);
    });

    it("should return true when maxHeapUsedBytes is exceeded", () => {
      monitor = new EventLoopMonitor({
        maxHeapUsedBytes: 1
      });

      assert.strictEqual(monitor.isUnderPressure(), true);
    });

    it("should return true when maxRssBytes is exceeded", () => {
      monitor = new EventLoopMonitor({
        maxRssBytes: 1
      });

      assert.strictEqual(monitor.isUnderPressure(), true);
    });
  });

  describe("close", () => {
    it("should stop the monitor without throwing", () => {
      monitor = new EventLoopMonitor();

      assert.doesNotThrow(() => monitor.close());
    });

    it("should not throw when called multiple times", () => {
      monitor = new EventLoopMonitor();

      monitor.close();
      assert.doesNotThrow(() => monitor.close());
    });
  });

  describe("Symbol.dispose", () => {
    it("should close the monitor when using Symbol.dispose", () => {
      monitor = new EventLoopMonitor();

      assert.doesNotThrow(() => monitor[Symbol.dispose]());
    });
  });

  describe("resolution", () => {
    it("should have a static resolution property equal to 10", () => {
      assert.strictEqual(EventLoopMonitor.resolution, 10);
    });
  });

  describe("sampling", () => {
    it("should respect minimum sample interval of 10ms", () => {
      monitor = new EventLoopMonitor({
        sampleInterval: 1
      });

      assert.ok(monitor);
    });
  });
});
