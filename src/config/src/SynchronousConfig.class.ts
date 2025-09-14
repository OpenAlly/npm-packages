// Import Node.js Dependencies
import path from "node:path";
import nodeFs from "node:fs";
import { EventEmitter } from "node:events";
import { isDeepStrictEqual } from "node:util";

// Import Third-party Dependencies
import Ajv, { JSONSchemaType } from "ajv";
import Observable from "zen-observable";
import * as TOML from "smol-toml";

// Import Internal Dependencies
import * as utils from "./utils.js";
import * as constants from "./constants.js";

// CONSTANTS
const kAjv = new Ajv({ useDefaults: true });

type ConfigAnySchema = Record<string | number | symbol, any>;

export interface SynchronousConfigOptions<T> {
  createOnNoEntry?: boolean;
  autoReload?: boolean;
  writeOnSet?: boolean;
  jsonSchema?: JSONSchemaType<T> | ConfigAnySchema;
  fs?: {
    readFileSync: typeof nodeFs.readFileSync;
    writeFileSync: typeof nodeFs.writeFileSync;
    existsSync: typeof nodeFs.existsSync;
  };
}

export class SynchronousConfig<T extends Record<string, any> = Record<string, any>> extends EventEmitter {
  #isDotFile = false;
  #isTOML = false;
  #configFilePath: string;
  #configSchemaFilePath: string;
  #createOnNoEntry: boolean;
  #writeOnSet: boolean;
  #configHasBeenRead = false;
  #subscriptionObservers: ([string, ZenObservable.SubscriptionObserver<any>])[] = [];
  #jsonSchema?: JSONSchemaType<T> | ConfigAnySchema;
  #cleanupTimeout: NodeJS.Timeout;
  #fs: Required<SynchronousConfigOptions<T>>["fs"];

  constructor(
    configFilePath: string,
    options: SynchronousConfigOptions<T> = Object.create(null)
  ) {
    super();
    if (typeof configFilePath !== "string") {
      throw new TypeError("The configPath must be a string");
    }
    if (typeof options !== "object") {
      throw new TypeError("The options must be an object");
    }

    const {
      createOnNoEntry = false,
      writeOnSet = false,
      jsonSchema,
      fs = nodeFs
    } = options;
    this.#fs = fs;

    const { dir, name, ext } = path.parse(configFilePath);
    this.#isDotFile = name.startsWith(".");

    if (this.#isDotFile) {
      this.#configFilePath = configFilePath;
    }
    else {
      let configFileExtension = ext;
      if (ext === "") {
        configFileExtension = this.#fs.existsSync(`${configFilePath}.toml`) ?
          ".toml" :
          constants.DEFAULT_EXT;
        this.#configFilePath = `${configFilePath}${configFileExtension}`;
      }
      else {
        this.#configFilePath = configFilePath;
      }

      if (!constants.SUPPORTED_EXT.has(configFileExtension)) {
        throw new Error("The config file extension should be .json or .toml, got: " + configFileExtension);
      }

      this.#isTOML = configFileExtension === ".toml";
    }

    this.#configSchemaFilePath = `${path.join(dir, name)}.schema.json`;

    this[constants.SYMBOLS.payload] = Object.create(null);
    this[constants.SYMBOLS.schema] = null;

    this.#createOnNoEntry = Boolean(createOnNoEntry);
    this.#writeOnSet = Boolean(writeOnSet);

    this.#subscriptionObservers = [];

    // Assign defaultSchema if exists!
    if (jsonSchema !== void 0) {
      if (typeof jsonSchema !== "object") {
        throw new TypeError("The options.jsonSchema must be an object");
      }
      this.#jsonSchema = jsonSchema;
    }
  }

  get payload(): T {
    return structuredClone(this[constants.SYMBOLS.payload]);
  }

  set payload(newPayload: T) {
    if (!this.#configHasBeenRead) {
      throw new Error("You must read config first before setting a new payload!");
    }

    if (newPayload === null || newPayload === undefined) {
      throw new TypeError("Invalid payload argument (cannot be null or undefined)");
    }

    if (isDeepStrictEqual(this[constants.SYMBOLS.payload], newPayload)) {
      return;
    }

    const tempPayload = structuredClone(newPayload);
    if (this[constants.SYMBOLS.schema](tempPayload) === false) {
      const ajvErrors = utils.formatAjvErrors(this[constants.SYMBOLS.schema].errors);
      const errorMessage = `Config.payload (setter) - AJV Validation failed with error(s) => ${ajvErrors}`;

      throw new Error(errorMessage);
    }

    this[constants.SYMBOLS.payload] = tempPayload;
    for (const [fieldPath, subscriptionObservers] of this.#subscriptionObservers) {
      subscriptionObservers.next(this.get(fieldPath));
    }
  }

  read(defaultPayload?: T) {
    if (typeof defaultPayload === "object" && !defaultPayload) {
      throw new TypeError("The defaultPayload must be an object");
    }

    let JSONConfig: any;
    let JSONSchema: object;
    let writeOnDisk = false;

    // Get and parse the JSON Configuration file (if exist, else it will throw ENOENT).
    // If it doesn't exists we replace it by the defaultPayload or the precedent loaded payload
    try {
      let configFileContent = this.#fs.readFileSync(this.#configFilePath, "utf-8");
      if (this.#isTOML === false && configFileContent.trim() === "") {
        configFileContent = "{}";
        writeOnDisk = true;
      }
      JSONConfig = this.#isTOML ? TOML.parse(configFileContent) : JSON.parse(configFileContent);
    }
    catch (err: any) {
      const isSyntaxError = err.name === "SyntaxError" || err.name === "TomlError";

      // If NodeJS Code is different from "ENOENTRY", then throw Error (only if createOnNoEntry is equal to false)
      if (isSyntaxError || !this.#createOnNoEntry || (Reflect.has(err, "code") && err.code !== "ENOENT")) {
        throw err;
      }

      JSONConfig = defaultPayload ? defaultPayload : this[constants.SYMBOLS.payload];

      // Ask to write the configuration to the disk at the end..
      writeOnDisk = true;
    }

    // Get and parse the JSON Schema file (only if it exists).
    // If he doesn't exist we replace it with a default Schema
    try {
      const schemaFileContent = this.#fs.readFileSync(this.#configSchemaFilePath, "utf-8");
      JSONSchema = JSON.parse(schemaFileContent);
    }
    catch (err: any) {
      if (Reflect.has(err, "code") && err.code !== "ENOENT") {
        throw err;
      }

      JSONSchema = this.#jsonSchema ?? constants.DEFAULT_SCHEMA;
    }

    // Setup Schema
    this[constants.SYMBOLS.schema] = kAjv.compile(JSONSchema);

    if (!this.#configHasBeenRead) {
      // Cleanup closed subscription every second
      if (this.#cleanupTimeout) {
        clearInterval(this.#cleanupTimeout);
      }
      this.#cleanupTimeout = setInterval(() => {
        this.#subscriptionObservers = this.#subscriptionObservers.filter(
          ([, subscriptionObservers]) => !subscriptionObservers.closed
        );
      }, 1_000);
      this.#cleanupTimeout.unref();
    }

    this.#configHasBeenRead = true;

    try {
      this.payload = JSONConfig;
    }
    catch (error) {
      this.#configHasBeenRead = false;
      throw error;
    }

    // Write the configuration on the disk for the first time (if there is no one available!).
    if (writeOnDisk) {
      this.writeOnDisk();
    }

    return this;
  }

  observableOf(fieldPath: string, depth = Infinity) {
    const fieldValue = this.get(fieldPath, depth);

    return new Observable((observer) => {
      observer.next(fieldValue);
      this.#subscriptionObservers.push([fieldPath, observer]);
    });
  }

  get<Y = any>(fieldPath: string, depth = Infinity): Y | null {
    if (!this.#configHasBeenRead) {
      throw new Error("You must read config first before getting a field!");
    }
    if (typeof fieldPath !== "string") {
      throw new TypeError("The fieldPath must be a string");
    }

    let value: Y | string[] | null = utils.deepGet<Y>(this.payload, fieldPath);
    if (value === null) {
      return null;
    }
    if (Number.isFinite(depth)) {
      value = utils.limitObjectDepth<Y>(value as Record<string, any>, depth);
    }

    return value;
  }

  set(fieldPath: string, fieldValue: any) {
    if (!this.#configHasBeenRead) {
      throw new Error("You must read config first before setting a field!");
    }
    if (typeof fieldPath !== "string") {
      throw new TypeError("The fieldPath must be a string");
    }

    this.payload = utils.deepSet<T>(this.payload, fieldPath, fieldValue);
    if (this.#writeOnSet) {
      this.writeOnDisk();
    }

    return this;
  }

  writeOnDisk() {
    if (!this.#configHasBeenRead) {
      throw new Error("You must read config first before writing it on the disk!");
    }

    const data = this.#isTOML ?
      TOML.stringify(this[constants.SYMBOLS.payload]) :
      JSON.stringify(this[constants.SYMBOLS.payload], null, 2);
    this.#fs.writeFileSync(this.#configFilePath, data);
  }

  close(): void {
    if (!this.#configHasBeenRead) {
      return;
    }

    for (const [, subscriptionObservers] of this.#subscriptionObservers) {
      subscriptionObservers.complete();
    }
    this.#subscriptionObservers = [];
    clearInterval(this.#cleanupTimeout);

    this.writeOnDisk();
    this.#configHasBeenRead = false;

    this.emit("close");
  }
}
