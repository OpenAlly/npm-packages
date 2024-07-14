// Import Node.js Dependencies
import { describe, before, after, it } from "node:test";
import assert from "assert";
import path from "node:path";
import url from "node:url";
import fs from "node:fs";
import os from "node:os";
import { once } from "node:events";

// Import Third-party Dependencies
import { TomlDate } from "smol-toml";

// Import Internal Dependencies
import { AsynchronousConfig } from "../src/index.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

type FooConfig = { foo: string };

describe("AsynchronousConfig", { concurrency: 1 }, () => {
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

  describe("JSON configuration", { concurrency: 1 }, () => {
    const configPath = path.join(__dirname, "fixtures", "codeMirror.json");
    let config: AsynchronousConfig;

    before(() => {
      const configToCreate = {
        addons: {
          cpu: {
            active: false,
            standalone: false
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(configToCreate, null, 2));

      config = new AsynchronousConfig(configPath, {
        createOnNoEntry: true,
        writeOnSet: true,
        autoReload: true
      });
    });

    after(() => {
      fs.rmSync(configPath);
    });

    it("should read and observe config", async() => {
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
      assert.deepEqual(observableResults[0], { active: false, standalone: false });
      assert.deepEqual(observableResults[1], { active: true, standalone: false });
      await config.close();
    });

    it("should update multiple fields", async() => {
      await config.read();

      config.set("newField", "value");
      await once(config, "configWritten");
      config.set("addons.foo", "bar");
      await once(config, "configWritten");
      config.set("hostname", "localhost");
      await once(config, "configWritten");

      assert.strictEqual(config.get("newField"), "value");
      assert.strictEqual(config.get("addons.foo"), "bar");
      assert.strictEqual(config.get("hostname"), "localhost");

      await config.close();
    });

    it("should get empty payload without calling read", () => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      assert.deepEqual(config.payload, {});
    });

    it("should find withSchema.json when withSchema given (without extension)", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "withSchema"));
      await config.read();
      assert.deepEqual(config.payload, { foo: "bar", name: 42 });
      await config.close();
    });

    it("should create an empty config object when file is empty", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", ".empty"));
      await config.read();
      assert.deepEqual(config.payload, {});
      await config.close();
      // reset file
      fs.writeFileSync(path.join(__dirname, "fixtures", ".empty"), "");
    });

    it("should return null when field does not exists", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"));
      await config.read();
      assert.strictEqual(config.get("doesNotExists"), null);
      await config.close();
    });

    it("should get keys when using depth", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "nested.json"));
      await config.read();
      assert.deepEqual(config.get("user"), {
        name: "John Doe",
        nested: {
          deep: {
            value: 42
          }
        }
      });
      assert.deepEqual(config.get("user", 1), { name: "John Doe", nested: ["deep"] });
      await config.close();
    });
  });

  describe("JSON configuration autoreload", () => {
    it("payload should be updated when file is updated", async() => {
      const configPath = path.join(__dirname, "fixtures", ".autoreload");
      const config = new AsynchronousConfig(configPath, { autoReload: true, createOnNoEntry: true, writeOnSet: true });
      await config.read({ foo: "bar" });
      await once(config, "configWritten");

      const observableResults: string[] = [];
      config.observableOf("foo").subscribe((value: any) => {
        observableResults.push(value);
      });

      fs.writeFileSync(configPath, JSON.stringify({ foo: "foo" }, null, 2));
      await once(config, "reload");

      assert.strictEqual(observableResults.length, 2);
      assert.strictEqual(observableResults[0], "bar");
      assert.strictEqual(observableResults[1], "foo");

      await config.close();
      fs.rmSync(configPath);
    });

    it("should observe the updated field multiple times", async() => {
      const configPath = path.join(__dirname, "fixtures", ".autoreload");
      const config = new AsynchronousConfig(configPath, { autoReload: true, createOnNoEntry: true, writeOnSet: true });
      await config.read({ foo: "bar" });
      await once(config, "configWritten");

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

      fs.writeFileSync(configPath, JSON.stringify({ foo: "foo" }, null, 2));
      await once(config, "reload");

      assert.strictEqual(observableResults.length, 6);
      const uniquesResults = [...new Set(observableResults)];
      assert.strictEqual(uniquesResults[0], "bar");
      assert.strictEqual(uniquesResults[1], "foo");

      await config.close();
      fs.rmSync(configPath);
    });
  });

  describe("JSON configuration with JSON Schema", () => {
    after(() => {
      fs.rmSync(path.join(__dirname, "fixtures", ".doesNotExists"));
    });

    it("should throw when set invalid value", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "withSchema.json"), {
        writeOnSet: true
      });
      await config.read();
      assert.throws(() => {
        config.set("foo", 42);
      }, {
        name: "Error",
        message: "Config.payload (setter) - AJV Validation failed with error(s) => property /foo must be string\n"
      });
      await config.close();
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
      await config.close();
      // reset the file
      fs.writeFileSync(path.join(__dirname, "fixtures", ".config"), JSON.stringify({ foo: "bar" }, null, 2));
    });

    it("should have a valid config once read", async() => {
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
      await config.read();
      assert.deepEqual(config.payload, { foo: "bar" });
      assert.strictEqual(config.get("foo"), "bar");
      await config.close();
    });

    it("should create file with default payload when file does not exists and createOnNoEntry is true", async() => {
      const configPath = path.join(__dirname, "fixtures", ".doesNotExists");
      assert(fs.existsSync(configPath) === false);

      const config = new AsynchronousConfig(configPath, { createOnNoEntry: true });
      await config.read({ boo: "boom" });

      assert.deepEqual(config.payload, { boo: "boom" });
      await config.close();
    });

    it("should throw when file does not exists and createOnNoEntry is false", async() => {
      const configPath = path.join(__dirname, "fixtures", ".doesNotExists2");
      assert(fs.existsSync(configPath) === false);

      const config = new AsynchronousConfig(configPath);
      await assert.rejects(async() => await config.read({ boo: "boom" }), {
        name: "Error",
        message: /ENOENT: no such file or directory/
      });
    });

    it("should recreate file on read when file does not exists and createOnNoEntry is true", async() => {
      const configPath = path.join(__dirname, "fixtures", ".doesNotExists3");
      assert(fs.existsSync(configPath) === false);

      const config = new AsynchronousConfig(configPath, { createOnNoEntry: true });
      await config.read({ boo: "boom" });
      await once(config, "configWritten");

      assert(fs.existsSync(configPath) === true);
      assert.deepEqual(config.payload, { boo: "boom" });

      fs.rmSync(configPath);
      assert(fs.existsSync(configPath) === false);

      await config.read();
      await once(config, "configWritten");
      assert(fs.existsSync(configPath) === true);
      assert.deepEqual(config.payload, { boo: "boom" });

      await config.close();
      fs.rmSync(configPath);
    });
  });

  describe("TOML configuration", () => {
    it("should read config", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "config.toml"));
      await config.read();

      assert.deepEqual(config.payload, {
        title: "TOML Example",
        owner: {
          dob: new TomlDate("1979-05-27T15:32:00.000Z"),
          name: "Tom Preston-Werner"
        }
      });
      await config.close();
    });

    it("should find config.toml when config given (without extension)", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "config"));
      await config.read();

      assert.deepEqual(config.payload, {
        title: "TOML Example",
        owner: {
          dob: new TomlDate("1979-05-27T15:32:00.000Z"),
          name: "Tom Preston-Werner"
        }
      });
      await config.close();
    });
  });

  describe("Dotfile configuration", () => {
    it("should read config", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", ".dummyConfig"));
      await config.read();
      assert.deepEqual(config.payload, {
        foo: "bar"
      });
      assert.strictEqual(config.get("foo"), "bar");
      await config.close();
    });
  });

  describe("JSON configuration with syntax error payload", () => {
    it("should throw an error", async() => {
      const config = new AsynchronousConfig(path.join(__dirname, "fixtures", "syntaxError.json"));
      await assert.rejects(async() => {
        await config.read();
      }, {
        name: "SyntaxError"
      });
    });
  });

  describe("When config has not been read", () => {
    let config: AsynchronousConfig;

    before(() => {
      config = new AsynchronousConfig(path.join(__dirname, "fixtures", ".dummyConfig"));
    });

    it("should throw when lazyWriteOnDisk is called", () => {
      assert.throws(() => {
        config.lazyWriteOnDisk();
      }, {
        name: "Error",
        message: "You must read config first before writing it on the disk!"
      });
    });

    it("should throw when writeOnDisk is called", async() => {
      await assert.rejects(async() => {
        await config.writeOnDisk();
      }, {
        name: "Error",
        message: "You must read config first before writing it on the disk!"
      });
    });

    it("should throw when close is called", async() => {
      await assert.rejects(async() => {
        await config.close();
      }, {
        name: "Error",
        message: "Cannot close unreaded configuration"
      });
    });

    it("should throw when set is called", () => {
      assert.throws(() => {
        config.set("foo", "bar");
      }, {
        name: "Error",
        message: "You must read config first before setting a field!"
      });
    });

    it("should throw when get is called", () => {
      assert.throws(() => {
        config.get("foo");
      }, {
        name: "Error",
        message: "You must read config first before getting a field!"
      });
    });

    it("should throw when setup autoReload", () => {
      assert.throws(() => {
        config.setupAutoReload();
      }, {
        name: "Error",
        message: "You must read config first before setting up autoReload!"
      });
    });
  });
});
