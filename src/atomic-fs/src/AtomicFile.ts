// Import Internal Dependencies
import {
  resolveTemporaryNaming,
  type TemporaryNaming
} from "./naming.ts";
import { renameFileAtomic } from "./operations/renameFileAtomic.ts";
import { writeFileAtomic } from "./operations/writeFileAtomic.ts";
import { writeFileIfAbsent } from "./operations/writeFileIfAbsent.ts";
import type {
  AtomicData,
  RenameFileAtomicOptions,
  WriteFileAtomicOptions
} from "./types.ts";

export type AtomicFileOptions = WriteFileAtomicOptions & RenameFileAtomicOptions;

/**
 * Binds a set of options once, so every write and rename shares the same
 * temporary naming strategy as `isTemporary`.
 */
export class AtomicFile {
  readonly naming: TemporaryNaming;

  #options: AtomicFileOptions;

  constructor(
    options: AtomicFileOptions = {}
  ) {
    this.naming = resolveTemporaryNaming(options.naming);
    this.#options = {
      ...options,
      naming: this.naming
    };
  }

  write(
    target: string,
    data: AtomicData,
    options: WriteFileAtomicOptions = {}
  ): Promise<void> {
    return writeFileAtomic(
      target,
      data,
      {
        ...this.#options,
        ...options
      }
    );
  }

  writeIfAbsent(
    target: string,
    data: AtomicData,
    options: WriteFileAtomicOptions = {}
  ): Promise<boolean> {
    return writeFileIfAbsent(
      target,
      data,
      {
        ...this.#options,
        ...options
      }
    );
  }

  rename(
    from: string,
    to: string,
    options: RenameFileAtomicOptions = {}
  ): Promise<boolean> {
    return renameFileAtomic(
      from,
      to,
      {
        ...this.#options,
        ...options
      }
    );
  }

  isTemporary = (
    basename: string
  ): boolean => this.naming.match(basename);
}
