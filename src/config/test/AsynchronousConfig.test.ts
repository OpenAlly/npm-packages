// Import Node.js Dependencies
import { describe, before, after, it, test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import url from "node:url";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { once } from "node:events";

// Import Internal Dependencies
import { AsynchronousConfig } from "../src/index.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

type FooConfig = { foo: string; };

describe("AsynchronousConfig", () => {
  // Keep the event-loop alive while running tests
  const keepAliveTimer: NodeJS.Timeout = setInterval(() => void 0, 100_000);

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
        new AsynchronousConfig(42 as any);
      }, {
        name: "TypeError",
        message: "The configPath must be a string"
      });
    });

    it("should throw when config file has invalid extension", () => {
      assert.throws(() => {
        new AsynchronousConfig(path.join(__dirname, "fixtures", "config.txt"));
      }, {
        name: "Error",
        message: "The config file extension should be .json or .toml, got: .txt"
      });
    });

    it("should throw when set payload before read", () => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      assert.throws(() => {
        config.payload = null as any;
      }, {
        name: "Error",
        message: "You must read config first before setting a new payload!"
      });
    });

    it("should throw when set empty payload", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      await config.read();
      assert.throws(() => {
        config.payload = null as any;
      }, {
        name: "TypeError",
        message: "Invalid payload argument (cannot be null or undefined)"
      });
      await config.close();
    });

    it("should throw when options is not object", () => {
      assert.throws(() => {
        new AsynchronousConfig(path.join(__dirname, "fixtures", "config.json"), 42 as any);
      }, {
        name: "TypeError",
        message: "The options must be an object"
      });
    });

    it("should throw when options.jsonSchema is not an object", () => {
      assert.throws(() => {
        new AsynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"), { jsonSchema: 42 as any });
      }, {
        name: "TypeError",
        message: "The options.jsonSchema must be an object"
      });
    });

    it("should throw when default payload is null or undefined", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      await assert.rejects(async() => {
        await config.read(null as any);
      }, {
        name: "TypeError",
        message: "The defaultPayload must be an object"
      });
    });

    it("GET should throw fieldPath is not string", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      await config.read();
      assert.throws(() => {
        config.get(42 as any);
      }, {
        name: "TypeError",
        message: "The fieldPath must be a string"
      });
    });
    it("SET should throw fieldPath is not string", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      await config.read();
      assert.throws(() => {
        config.set(42 as any, { foo: "bar" });
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
      writeOnSet: true,
      autoReload: true
    };

    it("should read and observe config", async(t) => {
      const configPath = path.join(
        tempDir,
        randomFileName()
      );
      fs.writeFileSync(configPath, JSON.stringify(configToCreate));

      const config = new AsynchronousConfig(configPath, configOptions);
      t.after(() => config.close());

      await config.read({
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        addons: {}
      });

      const observableResults: any = [];
      config.observableOf("addons.cpu").subscribe((value: any) => {
        observableResults.push(value);
      });

      config.set("addons.cpu.active", true);
      await once(config, "configWritten");
      assert.strictEqual(observableResults.length, 2);
      assert.deepStrictEqual(observableResults[0], { active: false, standalone: false });
      assert.deepStrictEqual(observableResults[1], { active: true, standalone: false });
    });

    it("should update multiple fields", async(t) => {
      const configPath = path.join(
        tempDir,
        randomFileName()
      );
      fs.writeFileSync(configPath, JSON.stringify(configToCreate));

      const config = new AsynchronousConfig(configPath, configOptions);
      t.after(() => config.close());

      await config.read();

      config.set("newField", "value");
      config.set("addons.foo", "bar");
      config.set("hostname", "localhost");
      await once(config, "configWritten");

      assert.strictEqual(config.get("newField"), "value");
      assert.strictEqual(config.get("addons.foo"), "bar");
      assert.strictEqual(config.get("hostname"), "localhost");
    });

    it("should get empty payload without calling read", () => {
      const config = new AsynchronousConfig(
        path.join(__dirname, "fixtures", "withSchema.json")
      );
      assert.deepStrictEqual(config.payload, {});
    });

    it("should find withSchema.json when withSchema given (without extension)", async(t) => {
      const config = new AsynchronousConfig(
        path.join(__dirname, "fixtures", "withSchema")
      );
      t.after(() => config.close());

      await config.read();
      assert.deepStrictEqual(config.payload, { foo: "bar", name: 42 });
    });

    it("should create an empty config object when file is empty", async(t) => {
      const config = new AsynchronousConfig(
        path.join(__dirname, "fixtures", ".empty")
      );
      t.after(() => config.close());

      await config.read();
      assert.deepStrictEqual(config.payload, {});
    });

    it("should return null when field does not exists", async(t) => {
      const config = new AsynchronousConfig(
        path.join(__dirname, "fixtures", "withSchema.json")
      );
      t.after(() => config.close());

      await config.read();
      assert.strictEqual(config.get("doesNotExists"), null);
    });

    it("should get keys when using depth", async(t) => {
      const config = new AsynchronousConfig(
        path.join(__dirname, "fixtures", "nested.json")
      );
      t.after(() => config.close());

      await config.read();
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
    });
  });

  describe("autoReload", () => {
    it("payload should be updated when file is updated", async() => {
      const configPath = path.join(tempDir, ".autoreload");
      const config = new AsynchronousConfig(configPath, {
        autoReload: true,
        createOnNoEntry: true,
        writeOnSet: true
      });

      try {
        await config.read({ foo: "bar" });
        await once(config, "configWritten", {
          signal: AbortSignal.timeout(1000)
        });

        const observableResults: string[] = [];
        config.observableOf("foo").subscribe((value: any) => {
          observableResults.push(value);
        });

        fs.writeFileSync(
          configPath,
          JSON.stringify({ foo: "foo" }, null, 2)
        );
        await once(config, "reload", {
          signal: AbortSignal.timeout(1000)
        });

        assert.strictEqual(observableResults.length, 2);
        assert.strictEqual(observableResults[0], "bar");
        assert.strictEqual(observableResults[1], "foo");
      }
      finally {
        await config.close();
      }
    });

    it("should observe the updated field multiple times", async() => {
      const configPath = path.join(tempDir, ".autoreload2");
      const config = new AsynchronousConfig(configPath, {
        autoReload: true,
        createOnNoEntry: true,
        writeOnSet: true
      });

      try {
        await config.read({ foo: "bar" });
        await once(config, "configWritten", {
          signal: AbortSignal.timeout(1000)
        });

        const observableResults: string[] = [];
        config.observableOf("foo").subscribe((value: any) => {
          observableResults.push(value);
        });
        config.observableOf("foo").subscribe((value: any) => {
          observableResults.push(value);
        });
        config.observableOf("foo").subscribe((value: any) => {
          observableResults.push(value);
        });

        fs.writeFileSync(
          configPath,
          JSON.stringify({ foo: "foo" }, null, 2)
        );
        await once(config, "reload", {
          signal: AbortSignal.timeout(1000)
        });

        assert.strictEqual(observableResults.length, 6);
        const uniquesResults = [...new Set(observableResults)];
        assert.strictEqual(uniquesResults[0], "bar");
        assert.strictEqual(uniquesResults[1], "foo");
      }
      finally {
        await config.close();
      }
    });
  });

  describe("JSON Schema", () => {
    it("should throw when set invalid value", async(t) => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"), {
        writeOnSet: true
      });
      t.after(() => config.close());

      await config.read();
      assert.throws(() => {
        config.set("foo", 42);
      }, {
        name: "Error",
        message: "Config.payload (setter) - AJV Validation failed with error(s) => property /foo must be string\n"
      });
    });

    it("should throw with default payload", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", ".config"), {
        writeOnSet: false,
        jsonSchema: {
          type: "object",
          properties: {
            foo: {
              type: "number"
            }
          }
        } as any
      });

      await assert.rejects(async() => {
        await config.read();
      }, {
        name: "Error",
        message: "Config.payload (setter) - AJV Validation failed with error(s) => property /foo must be number\n"
      });
    });

    it("should have a valid config once read", async(t) => {
      const config = new AsynchronousConfig<FooConfig>(path.join(__dirname, "fixtures", ".config"), {
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
      t.after(() => config.close());

      await config.read();
      assert.deepStrictEqual(config.payload, { foo: "bar" });
      assert.strictEqual(config.get("foo"), "bar");
    });

    it("should create file with default payload when file does not exists and createOnNoEntry is true", async(t) => {
      const configPath = path.join(tempDir, ".doesNotExists");
      assert(fs.existsSync(configPath) === false);

      const config = new AsynchronousConfig(configPath, { createOnNoEntry: true });
      t.after(() => config.close());

      await config.read({ boo: "boom" });
      assert.deepStrictEqual(config.payload, { boo: "boom" });
    });

    it("should throw when file does not exists and createOnNoEntry is false", async(t) => {
      const configPath = path.join(tempDir, ".doesNotExists2");
      assert(fs.existsSync(configPath) === false);

      const config = new AsynchronousConfig(configPath);
      t.after(() => config.close());

      await assert.rejects(async() => await config.read({ boo: "boom" }), {
        name: "Error",
        message: /ENOENT: no such file or directory/
      });
    });

    it("should recreate file on read when file does not exists and createOnNoEntry is true", async(t) => {
      const configPath = path.join(tempDir, ".doesNotExists3");
      assert(fs.existsSync(configPath) === false);

      const config = new AsynchronousConfig(configPath, { createOnNoEntry: true });
      t.after(() => config.close());

      await config.read({ boo: "boom" });
      await once(config, "configWritten", {
        signal: AbortSignal.timeout(1000)
      });

      assert.ok(fs.existsSync(configPath));
      assert.deepStrictEqual(config.payload, { boo: "boom" });

      fs.rmSync(configPath);
      assert(fs.existsSync(configPath) === false);

      await config.read();
      await once(config, "configWritten", {
        signal: AbortSignal.timeout(1000)
      });
      assert.ok(fs.existsSync(configPath));
      assert.deepStrictEqual(config.payload, { boo: "boom" });

      fs.rmSync(configPath);
    });
  });

  describe("read() formats", () => {
    test("Given TOML configuration files with and without extensions, it must successfully read their contents", async() => {
      const cases = [
        path.join(__dirname, "fixtures", "config.toml"),
        path.join(__dirname, "fixtures", "config")
      ];

      for (const configPath of cases) {
        const config = new AsynchronousConfig(configPath);

        try {
          await config.read();
          assert.deepStrictEqual(config.payload, {
            title: "TOML Example",
            owner: {
              dob: "1979-05-27T15:32:00.000Z",
              name: "Tom Preston-Werner"
            }
          });
        }
        finally {
          await config.close();
        }
      }
    });

    test("Given a configuration file no extension (starting with a dot), it must read it with no error", async(t) => {
      const config = new AsynchronousConfig(
        path.join(__dirname, "fixtures", ".dotconfig")
      );
      t.after(async() => await config.close());

      await config.read();
      assert.deepStrictEqual(config.payload, {
        foo: "bar"
      });
      assert.strictEqual(config.get("foo"), "bar");
    });
  });

  describe("When config has not been read", () => {
    it("should throw when writeOnDisk is called", async() => {
      const config = new AsynchronousConfig(
        path.join(__dirname, "fixtures", ".dotconfig")
      );

      await assert.rejects(async() => {
        await config.writeOnDisk();
      }, {
        name: "Error",
        message: "You must read config first before writing it on the disk!"
      });
    });

    it("should not throw and return without emitting close event", async() => {
      const config = new AsynchronousConfig(
        path.join(__dirname, "fixtures", ".dotconfig")
      );
      let closeEmit = 0;
      config.on("close", () => closeEmit++);

      await config.close();

      assert.strictEqual(
        closeEmit,
        0
      );
    });

    it("should throw when set is called", () => {
      const config = new AsynchronousConfig(
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
      const config = new AsynchronousConfig(
        path.join(__dirname, "fixtures", ".dotconfig")
      );

      assert.throws(() => {
        config.get("foo");
      }, {
        name: "Error",
        message: "You must read config first before getting a field!"
      });
    });

    it("should throw when setup autoReload", () => {
      const config = new AsynchronousConfig(
        path.join(__dirname, "fixtures", ".dotconfig")
      );

      assert.throws(() => {
        config.setupAutoReload();
      }, {
        name: "Error",
        message: "You must read config first before setting up autoReload!"
      });
    });
  });

  test("Given a JSON configuration file with a SyntaxError, read() method must return it", async() => {
    const config = new AsynchronousConfig(
      path.join(__dirname, "fixtures", "syntaxError.json")
    );

    await assert.rejects(async() => {
      await config.read();
    }, {
      name: "SyntaxError"
    });
  });
});

function randomFileName(ext = ".json"): string {
  return crypto.randomBytes(8).toString("hex") + ext;
}
