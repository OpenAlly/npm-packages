// Import Internal Dependencies
import { replaceCommit } from "./common/commit.ts";
import { stageAndCommit } from "./common/stage.ts";
import type {
  AtomicData,
  WriteFileAtomicOptions
} from "../types.ts";

export async function writeFileAtomic(
  target: string,
  data: AtomicData,
  options: WriteFileAtomicOptions = {}
): Promise<void> {
  await stageAndCommit(
    target,
    data,
    { ...options, commit: replaceCommit }
  );
}
