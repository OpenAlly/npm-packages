# AI-slop report: README.md, docs/AtomicFile.md, docs/naming.md, docs/operations/{renameFileAtomic,writeFileAtomic,writeFileIfAbsent}.md

| | |
|---|---|
| **Analyzed** | 1,920 words of author prose across 6 files (318 / 158 / 373 / 282 / 593 / 196) |
| **Content type** | Reference / API documentation |
| **Mode** | detect + fix + verify. Author brief: "succinct and factual API documentation", keep the README sections |
| **Source snapshot** | `<scratchpad>/slop/<basename>.before` (the files are untracked in git, so this is the only "before") |
| **Scanner** | `scripts/scan.mjs` — lexical + structural + formatting tiers |

## 1. Method

Triad rule: a 3-item list counts only if it fails ≥2 of the deletion / reorder / substitution tests. Structural candidates found across the six files: 7 3-item lists (37% of 19 coordinate lists), 1 closer, 1 balanced semicolon, 0 uniform-rhythm runs, 0 fragment runs, 2 explanatory colons (1.0/1k), 0 questions; burstiness 0.39–0.62 per file; paragraph-shape cv 0.29–0.82; section-length cv 0.53–1.14. Most-repeated sentence openers: "with the…" ×3 (AtomicFile.md, the three method one-liners; legitimate parallel reference entries). Lexical candidates: 10 (7 "rather than / instead of", 2 "genuinely", 1 "worth stating"). Excluded: code blocks, badges/HTML, URLs. Tables are masked by the scanner and were read by eye.

The scanner finds little here. What makes these pages read as generated is register, which has no detector: design rationale narrated in a persuasive voice ("on purpose", "can never drift apart", "worth stating plainly", "the price is"), the same argument made in three files, and figurative verbs ("won", "racing", "waits it out") where an API doc would state the return value or error code. Those were found by close reading and counted with `grep` so they keep a denominator.

- Both versions were scanned in a single invocation; the deltas in section 6 are comparable.

### Voice signals to preserve

1. Short declaratives with a causal "so" clause ("Views are written by their `byteLength`, so a `Float64Array` of two elements produces 16 bytes").
2. Concrete particulars everywhere: error codes, syscall names, byte counts, regexes.
3. British spelling ("honoured") and the word "clobber".
4. Terse lowercase code comments ("// exactly 1", "// false when taken").
5. Candid statement of limits (SIGKILL, cross-process, FAT32) with no hedging.

## 2. Summary

| Pattern | Judged | Candidates | Density (/1k) | Severity |
|---|---|---|---|---|
| Persuasive design-rationale / throat-clearing (§1.4, §5.3) | 6 | — (close reading) | 3.1 | HIGH |
| Figurative verbs where a return value or errno belongs ("won", "racing", "waits it out", "goes down") | 8 | 14 grep hits | 4.2 | HIGH |
| Kicker / antithesis closers (§1.7) | 3 | 1 scanner + close reading | 1.6 | HIGH |
| "which is what / which is why / what X adds is" cleft | 8 | 9 grep hits | 4.2 | MEDIUM |
| Same argument repeated across files (writer/filter "drift") | 3 | 3 | — | MEDIUM |
| "rather than / instead of" preference framing (§1.13) | 4 | 7 | 2.1 | MEDIUM |
| "genuinely" soft signal (§2.6) | 2 | 2 | 1.0 | LOW |
| Rhythmic triads (§1.3) | 1 | 7 | 0.5 | LOW |
| Doc/source mismatches (not slop; found while fact-checking) | 4 | — | — | — |

**Overall read:** No vocabulary slop, no em dashes, no bold stems, healthy structure. The habit is a narrator who keeps justifying the design to the reader instead of documenting it, concentrated in README "Recognizing temporary files", naming.md, and the two `overwrite: false` passages. The fix is to state behaviour and cut the advocacy; the particulars are already there.

## 3. Findings

### 1. Throat-clearing — HIGH
**README.md:124**
> "Atomic" covers less ground than it sounds like, so these five are worth stating plainly.

"worth stating plainly" is the catalogued §1.4 frame; the sentence announces candour instead of introducing the table.

### 2. Persuasive setup + preference framing — HIGH
**README.md:79**
> Any process that lists a directory while writes are in flight will run into temporary files. Rather than leave you to guess their shape, a `TemporaryNaming` both generates names and recognizes the ones it generated:

Rejects an alternative nobody proposed ("leave you to guess").

### 3. Design advocacy — HIGH
**docs/naming.md:16**
> The two halves exist together on purpose. Anything that lists a directory … would leave every caller to guess their shape. Because `create` and `match` come from one object, a listing filter cannot drift away from the writer that produces the names.

Third telling of the argument in #2 (also README:97, AtomicFile.md:91).

### 4. Rhythmic triad + personification — HIGH
**README.md:97**
> Because the writer and the filter share one strategy, the two can never drift apart, and a custom strategy changes both at once:

1 of 7 triad candidates judged rhythmic: fails deletion (clauses 1–2 restate each other) and substitution.

### 5. Antithesis closer — HIGH
**README.md:39**
> A reader never sees a half-written file, and a crash never leaves one.

### 6. Kicker — HIGH
**docs/naming.md:110**
> …and nothing but a later listing will ever see it again.

### 7. Signpost + "worth" + cleft — HIGH
**docs/naming.md:89**
> The two forms are not equivalent in cost or reach. … is worth building once … is what the `TemporaryNaming` interface is for.

### 8. "The price is" + balanced antithesis — HIGH
**docs/operations/renameFileAtomic.md:68**
> The destination is therefore either absent or complete, never empty or partial. The price is that the copy happens before the claim, so it is wasted when the destination turns out to be taken.

### 9. Figurative "won" ×3 — HIGH (density)
**README.md:50, README.md:117, docs/operations/writeFileIfAbsent.md:3**
> …claims a path without ever clobbering it, and tells you whether you won

The function resolves a boolean; say so.

### 10. "the form to reach for" — MEDIUM
**README.md:110**

### 11. "fails … rather than racing" ×2 — MEDIUM
**README.md:132, docs/operations/renameFileAtomic.md:52**

### 12. Pseudo-cleft "What this X adds (around it) is" ×2 — MEDIUM
**README.md:128, docs/operations/renameFileAtomic.md:48**

### 13. "which is what / which is why" cleft — MEDIUM
**README.md:130, AtomicFile.md:3, writeFileAtomic.md:63, writeFileAtomic.md:100, writeFileIfAbsent.md:43 (×2), naming.md:58, README.md:110**
8 of 9 grep candidates judged (naming.md:43 sits in a table cell and reads fine).

### 14. Narrative flourishes in writeFileAtomic.md — MEDIUM
**:29** heading "What happens, in order"; **:39** "Whatever happens,"; **:71** "leaves the directory as it found it" (also untrue with `mkdir: true`); **:120** "when the process goes down"; **:100** "stays off unless you ask"; **:106** "ignored there rather than failing"; **:134** "The lock lives in the module".

### 15. Figurative table cells — MEDIUM
**README.md:129, :131**
> nothing decides who wins … The default retry usually waits it out

### 16. "survives being pulled off and handed to something else" — MEDIUM
**docs/AtomicFile.md:106**

### 17. Opening summaries padded with rationale — MEDIUM
**renameFileAtomic.md:3, :23, writeFileIfAbsent.md:3, :31, AtomicFile.md:3, :91, README.md:116–119**

### 18. "genuinely named" ×2 — LOW
**README.md:112, docs/naming.md:64**

### 19. House boilerplate "can be easily installed" — LOW
**README.md:29** — identical in all 10 package READMEs of the monorepo.

### 20. Doc/source mismatches — not slop, flagged for the "factual" brief
- writeFileAtomic.md:43 "These four are accepted by every operation": `cleanupOnExit` is a fifth shared option (`SharedOptions` in src/types.ts, read by `renameFileAtomic`), but is documented under Write options.
- naming.md:64 gives the default pattern as `^\.(.+)\.[0-9a-f]+\.tmp$`; the source builds `^\..+\.[0-9a-f]{12}\.tmp$`.
- writeFileAtomic.md:96 says EPERM/EINVAL/ENOSYS `chown` failures are swallowed; the source also covers `chmod`, ignores ENOSYS always and EPERM/EINVAL only when non-root. It also says ownership is "never applied" on Windows; an explicit `chown` is still attempted.
- writeFileAtomic.md:87 "When neither is given": `mode` and `chown` are inherited independently.

## 4. Ledger

- Rhythmic triads (1 of 7): README L97. Genuine: naming L89, L110; rename L48, L52; write L27, L110.
- Closers (0 of 1 scanner candidates): write L124 "Calls to different paths run in parallel." is a plain fact. Judged kickers came from close reading: README L39, naming L110, rename L68.
- Balanced semicolons (0 of 1): writeFileIfAbsent L43 is a real contrast of filesystems.
- Explanatory colons (0 of 2 judged reveals): naming L58, write L134.
- "rather than / instead of" (4 of 7): README L79, rename L52, write L100, write L106. Plain: rename L23, L68, write L139.

## 5. Fixes applied

| # | Location | Disposition | What was done |
|---|---|---|---|
| 1 | README.md:124 | **Fixed** | Replaced with a plain lead-in to the table: `What "atomic" covers in this package:` |
| 2 | README.md:79 | **Fixed** | States the behaviour; rejected alternative dropped, not re-landed |
| 3 | naming.md:16 | **Fixed** | Four-sentence justification cut to two factual sentences |
| 4 | README.md:97 | **Fixed** | "never drift apart" clause removed; "It follows the `naming` option:" |
| 5 | README.md:39 | **Fixed** | "Readers see the old file or the new one, even after a crash." Subject is now `writeFileAtomic` |
| 6 | naming.md:110 | **Fixed** | Kicker clause deleted; paragraph ends on the SIGKILL fact |
| 7 | naming.md:89 | **Fixed** | Signpost sentence deleted; the rest split into four imperative/factual sentences |
| 8 | renameFileAtomic.md:68 | **Fixed** | "never empty or partial" and "The price is" removed; facts kept |
| 9 | README.md:50, :117, writeFileIfAbsent.md:3 | **Fixed** | "won" → "resolves `false` otherwise" / dropped (the return value is documented on the next line) |
| 10 | README.md:110 | **Fixed** | "for a strategy shared across many writes or a shape other than …"; now links to naming.md |
| 11 | README.md:132, renameFileAtomic.md:52 | **Fixed** | "fails with `EEXIST` when the destination exists" |
| 12 | README.md:128, renameFileAtomic.md:48 | **Fixed** | "The package adds …" / "The function adds …" |
| 13 | 8 sites | **Fixed** | Clefts unwound, each differently (split sentence, "so …", "where …", deletion) |
| 14 | writeFileAtomic.md | **Fixed** | Heading → "Steps"; "Whatever happens" → "whether it resolves or rejects"; "leaves the directory as it found it" deleted (false with `mkdir`); "goes down", "unless you ask", "rather than failing", "lives in the module" replaced with plain statements |
| 15 | README.md:129, :131 | **Fixed** | "which write survives is not controlled"; "covers a brief hold" |
| 16 | AtomicFile.md:106 | **Fixed** | "so it can be destructured:" |
| 17 | 7 sites | **Fixed** | Openers cut to what the function does; API list entries trimmed |
| 18 | README.md:112, naming.md:64 | **Fixed** | "a file named `.notes.tmp` does not match" |
| 19 | README.md:29 | **Kept** | House boilerplate shared by all 10 package READMEs; changing one breaks the convention |
| 20 | 4 doc/source mismatches | **Fixed** | Corrected against the source, see below. These change claims, so the author should confirm them |

### Diffs for the substantive edits

**#20a — writeFileAtomic.md, Shared options**
> before: These four are accepted by every operation in the package. (`cleanupOnExit` listed under Write options)
> after:  Accepted by every operation in the package. (`cleanupOnExit` row and its subsection moved under Shared options; "mid-write" → "mid-operation")

**#20b — naming.md `match`**
> before: With the defaults it is `^\.(.+)\.[0-9a-f]+\.tmp$`
> after:  With the defaults it is `^\..+\.[0-9a-f]{12}\.tmp$`

**#20c — writeFileAtomic.md mode and chown**
> before: `chown` failures that a non-root process cannot avoid, `EPERM`, `EINVAL` and `ENOSYS`, are swallowed; anything else is thrown. On Windows `process.getuid` does not exist, so ownership is never inherited and never applied.
> after:  `chown` and `chmod` failures are ignored on `ENOSYS`, and on `EPERM` or `EINVAL` in a non-root process; anything else is thrown. On Windows `process.getuid` does not exist, so ownership is never inherited.

**#20d — writeFileAtomic.md mode and chown**
> before: When neither is given, both are read from the existing target, so rewriting a file preserves the permissions somebody set on it:
> after:  Each is read from the existing target when not given, so rewriting a file preserves its permissions and owner:

**README usage example** — the single `renameFileAtomic` code block was split in two at its blank line, with "With `overwrite: false` it resolves `false` when the destination exists:" between. No code changed.

**writeFileAtomic.md Concurrency** — "so two writes never share a temporary file" deleted: names are random, so they never would regardless of the queue.

All other before/after pairs are in `<scratchpad>/fix.mjs` as exact-match replacement pairs.

### Not fixed, by design

- README sections, badges, install block and all code samples.
- Table option descriptions, other than the two README Guarantees cells in #15 and the moved `cleanupOnExit` row.
- "clobber", "honoured", "the last one wins", "A per-call option wins" — voice, and accurate.
- writeFileAtomic.md:124 "Calls to different paths run in parallel." — short, factual.

## 6. Verification

Each file scanned against its `.before` in one invocation.

### 6.1 Mechanical deltas

| Metric | Before | After | Direction |
|---|---|---|---|
| Words of prose (6 files) | 1,920 | 1,607 | −16%, requested ("succinct") |
| Lexical hits (total) | 11 | 2 | ↓ |
| 3-item coordinate lists | 7 | 3 | ↓ |
| Kicker closers (scanner) | 1 | 2 | ↑ see below |
| Fragment runs | 0 | 0 | — |
| Uniform-rhythm runs | 0 | 0 | — |
| Explanatory colons | 2 | 1 | ↓ |
| Self-answered questions | 0 | 0 | — |
| Burstiness README / AtomicFile / naming / rename / write / ifAbsent | 0.62 / 0.522 / 0.529 / 0.448 / 0.417 / 0.39 | 0.653 / 0.494 / 0.432 / 0.54 / 0.513 / 0.378 | mixed |

Burstiness rose in three files and fell in three. The naming.md drop (0.529 → 0.432) comes from deleting the two longest rationale paragraphs, which is the requested cut; it stays above 0.40 and the page is mostly tables and code. writeFileIfAbsent.md was already at 0.39 and is 171 words; not meaningful at that size.

**Patterns that rose.**

| Pattern | Before | After | Δ/1k | Verdict |
|---|---|---|---|---|
| Kicker closers, writeFileAtomic.md | 1 (1.69) | 2 (3.86) | +2.17 | False positive. L64 "Pass an explicit policy to retry for longer:" is a lead-in to a code block that went from 9 words to 8 and crossed the detector's length threshold. Not a closer. |

`· denser` marks: 3-item lists in writeFileAtomic.md (2 → 2, both judged genuine) and the semicolon pair in writeFileIfAbsent.md (NTFS vs FAT32, genuine). The gate only covers patterns with a detector; the register findings in this report have none, so they were re-checked by grep: "won", "drift", "genuinely", "worth", "racing", "which is what/why" → 0 remaining outside one table cell (naming.md:43).

### 6.2 Remediation-artifact check

| Check | Result |
|---|---|
| Relocated negation (§9.1) | clean — no "not X" tails added; "never empty or partial" deleted, not moved |
| Lateral substitution (§9.2) | clean — "rather than / instead of" fell 7 → 2; the one riser is dispositioned above |
| Signpost laundering (§9.3) | clean — README:124 is now a table lead-in with no candour frame |
| Over-flattening (§9.4) | naming.md burstiness fell 0.10; accepted, see 6.1 |
| Uniform fix shape (§9.5) | clean — clefts repaired five different ways |
| Voice erasure (§9.6) | clean — "clobber" (README:118, rename:3), "honoured" (write:49), "so" clauses, error codes all present |
| Invented specificity (§9.7) | clean — the only new facts (`{12}`, `chmod`, non-root, fifth shared option) come from `src/` |

### 6.3 Residual findings

| # | Location | Pattern | Status |
|---|---|---|---|
| 19 | README.md:29 | "can be easily installed" | Kept by design (monorepo boilerplate) |
| 20 | writeFileAtomic.md, naming.md | claim corrections | Fixed from source; author to confirm |
| — | writeFileAtomic.md Steps 3–4 | source resolves `mode`/`chown` before building the temporary name | Newly noticed, left alone; order is not observable |

### 6.4 Verdict

- **Clean with open questions** — no HIGH findings remain and no remediation artifacts were introduced; the four source-derived corrections in #20 await the author's confirmation.
