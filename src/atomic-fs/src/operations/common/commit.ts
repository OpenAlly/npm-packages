// Import Internal Dependencies
import {
  errorCode,
  type AtomicFs
} from "../../internal/fs.ts";
import {
  withRetry,
  type ResolvedRetry
} from "../../internal/retry.ts";

export type CommitContext = {
  fs: Pick<AtomicFs, "rename" | "link" | "unlink">;
  retry: ResolvedRetry;
};

export type Commit = (
  context: CommitContext,
  from: string,
  to: string
) => Promise<boolean>;

export async function replaceCommit(
  context: CommitContext,
  from: string,
  to: string
): Promise<boolean> {
  const { fs, retry } = context;

  await withRetry(
    () => fs.rename(from, to),
    retry
  );

  return true;
}

export async function exclusiveCommit(
  context: CommitContext,
  from: string,
  to: string
): Promise<boolean> {
  const { fs, retry } = context;

  try {
    await withRetry(
      () => fs.link(from, to),
      retry
    );
  }
  catch (error) {
    if (errorCode(error) === "EEXIST") {
      return false;
    }

    throw error;
  }

  await fs.unlink(from);

  return true;
}
