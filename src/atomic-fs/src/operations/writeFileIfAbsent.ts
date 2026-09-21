// Import Internal Dependencies
import { exclusiveCommit } from "./common/commit.ts";
import { stageAndCommit } from "./common/stage.ts";
import type {
  AtomicData,
  WriteFileAtomicOptions
} from "../types.ts";

export function writeFileIfAbsent(
  target: string,
  data: AtomicData,
  options: WriteFileAtomicOptions = {}
): Promise<boolean> {
  return stageAndCommit(
    target,
    data,
    { ...options, commit: exclusiveCommit }
  );
}
