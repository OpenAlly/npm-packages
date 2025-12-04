// Import Node.js Dependencies
import { describe, before, after, it, test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import url from "node:url";
import fs from "node:fs";
import os from "node:os";
import timers from "node:timers";
import crypto from "node:crypto";

// Import Internal Dependencies
import { SynchronousConfig } from "../src/index.ts";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

describe("SynchronousConfig", () => {
  // Keep the event-loop alive while running tests
  const keepAliveTimer = setInterval(() => void 0, 100_000);

  let tempDir: string;

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "openally-config-"));
  });

  after(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
    clearInterval(keepAliveTimer);
  });

  describe("given bad parameters", () => {
    it("should throw when path is not a string", () => {
      assert.throws(() => {
        // @ts-expect-error
        new SynchronousConfig(42);
      }, {
        name: "TypeError",
        message: "The configPath must be a string"
      });
    });

    it("should throw when config file has invalid extension", () => {
      assert.throws(() => {
        new SynchronousConfig(path.join(__dirname, "fixtures", "config.txt"));
      }, {
        name: "Error",
        message: "The config file extension should be .json or .toml, got: .txt"
      });
    });

    it("should throw when set payload before read", () => {
      const config = new SynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      assert.throws(() => {
        // @ts-expect-error
        config.payload = null;
      }, {
        name: "Error",
        message: "You must read config first before setting a new payload!"
      });
    });

    it("should throw when set empty payload", () => {
      const config = new SynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      config.read();
      assert.throws(() => {
        // @ts-expect-error
        config.payload = null;
      }, {
        name: "TypeError",
        message: "Invalid payload argument (cannot be null or undefined)"
      });
      config.close();
    });

    it("should throw when options is not object", () => {
      assert.throws(() => {
        // @ts-expect-error
        new SynchronousConfig(path.join(__dirname, "fixtures", "config.json"), 42);
      }, {
        name: "TypeError",
        message: "The options must be an object"
      });
    });

    it("should throw when options.jsonSchema is not an object", () => {
      assert.throws(() => {
        new SynchronousConfig(
          path.join(__dirname, "fixtures", "withSchema.json"),
          // @ts-expect-error
          { jsonSchema: 42 }
        );
      }, {
        name: "TypeError",
        message: "The options.jsonSchema must be an object"
      });
    });

    it("should throw when default payload is null or undefined", () => {
      const config = new SynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      assert.throws(() => {
        // @ts-expect-error
        config.read(null);
      }, {
        name: "TypeError",
        message: "The defaultPayload must be an object"
      });
    });

    it("GET should throw fieldPath is not string", () => {
      const config = new SynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      config.read();
      assert.throws(() => {
        // @ts-expect-error
        config.get(42);
      }, {
        name: "TypeError",
        message: "The fieldPath must be a string"
      });
    });
    it("SET should throw fieldPath is not string", () => {
      const config = new SynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      config.read();
      assert.throws(() => {
        // @ts-expect-error
        config.set(42, { foo: "bar" });
      }, {
        name: "TypeError",
        message: "The fieldPath must be a string"
      });
    });
  });

  describe("JSON configuration", () => {
    const configToCreate = {
      addons: {
        cpu: {
          active: false,
          standalone: false
        }
      }
    };
    const configOptions = {
      createOnNoEntry: true,
      writeOnSet: true
    };

    it("should read and observe config", async() => {
      const configPath = path.join(tempDir, randomFileName());
      fs.writeFileSync(configPath, JSON.stringify(configToCreate));

      const config = new SynchronousConfig(configPath, configOptions);
      config.read({
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        addons: {}
      });

      const observableResults: unknown[] = [];
      config.observableOf("addons.cpu").subscribe((value) => {
        observableResults.push(value);
      });

      config.set("addons.cpu.active", true);

      await timers.promises.setTimeout(10);
      assert.strictEqual(observableResults.length, 2);
      assert.deepStrictEqual(observableResults[0], { active: false, standalone: false });
      assert.deepStrictEqual(observableResults[1], { active: true, standalone: false });
      config.close();
    });

    it("should update multiple fields", () => {
      const configPath = path.join(tempDir, randomFileName());
      fs.writeFileSync(configPath, JSON.stringify(configToCreate));

      const config = new SynchronousConfig(configPath, configOptions);
      config.read();

      config.set("newField", "value");
      config.set("addons.foo", "bar");
      config.set("hostname", "localhost");

      assert.strictEqual(config.get("newField"), "value");
      assert.strictEqual(config.get("addons.foo"), "bar");
      assert.strictEqual(config.get("hostname"), "localhost");
      config.close();
    });

    it("should get empty payload without calling read", () => {
      const config = new SynchronousConfig(
        path.join(__dirname, "fixtures", "withSchema.json")
      );
      assert.deepStrictEqual(config.payload, {});
    });

    it("should find withSchema.json when withSchema given (without extension)", () => {
      const config = new SynchronousConfig(
        path.join(__dirname, "fixtures", "withSchema")
      );
      config.read();
      assert.deepStrictEqual(config.payload, { foo: "bar", name: 42 });
      config.close();
    });

    it("should create an empty config object when file is empty", () => {
      const config = new SynchronousConfig(
        path.join(__dirname, "fixtures", ".empty")
      );
      config.read();
      assert.deepStrictEqual(config.payload, {});
      config.close();
    });

    it("should return null when field does not exists", () => {
      const config = new SynchronousConfig(
        path.join(__dirname, "fixtures", "withSchema.json")
      );
      config.read();
      assert.strictEqual(config.get("doesNotExists"), null);
      config.close();
    });

    it("should get keys when using depth", () => {
      const config = new SynchronousConfig(
        path.join(__dirname, "fixtures", "nested.json")
      );
      config.read();
      assert.deepStrictEqual(config.get("user"), {
        name: "John Doe",
        nested: {
          deep: {
            value: 42
          }
        }
      });
      assert.deepStrictEqual(
        config.get("user", 1),
        { name: "John Doe", nested: ["deep"] }
      );
      config.close();
    });
  });

  describe("JSON Schema", () => {
    it("should throw when set invalid value", () => {
      const config = new SynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"), {
        writeOnSet: true
      });
      config.read();
      assert.throws(() => {
        config.set("foo", 42);
      }, {
        name: "Error",
        message: /AJV Validation failed/
      });
      config.close();
    });

    it("should throw with default payload", () => {
      const config = new SynchronousConfig(path.join(__dirname, "fixtures", ".config"), {
        writeOnSet: false,
        jsonSchema: {
          type: "object",
          properties: {
            foo: {
              type: "number"
            }
          }
        }
      });
      assert.throws(() => {
        config.read();
      }, {
        name: "Error",
        message: /AJV Validation failed/
      });
    });

    it("should have a valid config once read", () => {
      const config = new SynchronousConfig(path.join(__dirname, "fixtures", ".config"), {
        writeOnSet: false,
        jsonSchema: {
          type: "object",
          properties: {
            foo: {
              type: "string"
            }
          },
          required: ["foo"],
          additionalProperties: false
        }
      });
      config.read();
      assert.deepStrictEqual(config.payload, { foo: "bar" });
      assert.strictEqual(config.get("foo"), "bar");
      config.close();
    });

    it("should create file with default payload when file does not exists and createOnNoEntry is true", () => {
      const configPath = path.join(tempDir, ".doesNotExists");
      assert(fs.existsSync(configPath) === false);

      const config = new SynchronousConfig(configPath, { createOnNoEntry: true });
      config.read({ boo: "boom" });
      assert.deepStrictEqual(config.payload, { boo: "boom" });
      config.close();
    });

    it("should throw when file does not exists and createOnNoEntry is false", () => {
      const configPath = path.join(tempDir, ".doesNotExists2");
      assert(fs.existsSync(configPath) === false);

      const config = new SynchronousConfig(configPath);
      assert.throws(() => config.read({ boo: "boom" }), {
        name: "Error",
        message: /ENOENT: no such file or directory/
      });
    });

    it("should recreate file on read when file does not exists and createOnNoEntry is true", () => {
      const configPath = path.join(tempDir, ".doesNotExists3");
      assert(fs.existsSync(configPath) === false);

      const config = new SynchronousConfig(configPath, { createOnNoEntry: true });
      config.read({ boo: "boom" });
      assert.ok(fs.existsSync(configPath));
      assert.deepStrictEqual(config.payload, { boo: "boom" });

      fs.rmSync(configPath);
      assert(fs.existsSync(configPath) === false);

      config.read();
      assert.ok(fs.existsSync(configPath));
      assert.deepStrictEqual(config.payload, { boo: "boom" });

      fs.rmSync(configPath);
      config.close();
    });
  });

  describe("read() formats", () => {
    test("Given TOML configuration files with and without extensions, it must successfully read their contents", () => {
      const cases = [
        path.join(__dirname, "fixtures", "config.toml"),
        path.join(__dirname, "fixtures", "config")
      ];

      for (const configPath of cases) {
        const config = new SynchronousConfig(configPath);
        config.read();
        assert.deepStrictEqual(config.payload, {
          title: "TOML Example",
          owner: {
            dob: "1979-05-27T15:32:00.000Z",
            name: "Tom Preston-Werner"
          }
        });
        config.close();
      }
    });

    test("Given a configuration file no extension (starting with a dot), it must read it with no error", () => {
      const config = new SynchronousConfig(
        path.join(__dirname, "fixtures", ".dotconfig")
      );
      config.read();
      assert.deepStrictEqual(config.payload, {
        foo: "bar"
      });
      assert.strictEqual(config.get("foo"), "bar");
      config.close();
    });
  });

  describe("When config has not been read", () => {
    it("should throw when writeOnDisk is called", () => {
      const config = new SynchronousConfig(
        path.join(__dirname, "fixtures", ".dotconfig")
      );

      assert.throws(() => {
        config.writeOnDisk();
      }, {
        name: "Error",
        message: "You must read config first before writing it on the disk!"
      });
    });

    it("should not throw and return without emitting close event", () => {
      const config = new SynchronousConfig(
        path.join(__dirname, "fixtures", ".dotconfig")
      );
      let closeEmit = 0;
      config.on("close", () => closeEmit++);

      config.close();

      assert.strictEqual(
        closeEmit,
        0
      );
    });

    it("should throw when set is called", () => {
      const config = new SynchronousConfig(
        path.join(__dirname, "fixtures", ".dotconfig")
      );

      assert.throws(() => {
        config.set("foo", "bar");
      }, {
        name: "Error",
        message: "You must read config first before setting a field!"
      });
    });

    it("should throw when get is called", () => {
      const config = new SynchronousConfig(
        path.join(__dirname, "fixtures", ".dotconfig")
      );

      assert.throws(() => {
        config.get("foo");
      }, {
        name: "Error",
        message: "You must read config first before getting a field!"
      });
    });
  });

  test("Given a JSON configuration file with a SyntaxError, read() method must return it", () => {
    const config = new SynchronousConfig(
      path.join(__dirname, "fixtures", "syntaxError.json")
    );

    assert.throws(() => {
      config.read();
    }, {
      name: "SyntaxError"
    });
  });
});

function randomFileName(ext = ".json") {
  return crypto.randomBytes(8).toString("hex") + ext;
}
