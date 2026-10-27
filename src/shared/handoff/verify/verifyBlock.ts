import { HARD_RULES } from "./data/policy";
import { checkNumbers } from "./r1Numbers";
import { checkHex } from "./r2Hex";
import { checkNames } from "./r3Names";
import { checkCriteria } from "./r4Criteria";
import { checkClaims } from "./r5Claims";
import { checkLabels } from "./r6Labels";
import { checkShape, checkStructure } from "./r7Structure";
import { blockContext } from "./scan";
import type { VerifyContext, VerifyResult, Violation } from "./types";

function run(raw: unknown, ctx: VerifyContext, filled: boolean): Violation[] {
  const shape = checkShape(raw);
  if (shape.length > 0) return shape;
  const sentences = raw as string[];
  const c = blockContext(ctx, filled);
  return [
    ...checkNumbers(sentences, c),
    ...checkHex(sentences, c),
    ...checkNames(sentences, c),
    ...checkCriteria(sentences, c),
    ...checkClaims(sentences, c),
    ...checkLabels(sentences, c),
    ...checkStructure(sentences, c)
  ];
}

/** Raw model output in id form: any violation rejects the block */
export function verifyModelOutput(raw: unknown, ctx: VerifyContext): VerifyResult {
  const found = run(raw, ctx, false);
  return { ok: found.length === 0, blocking: found, warnings: [] };
}

/** A designer's edit of filled text: the hard rules block it, the others only warn */
export function verifyEdit(raw: unknown, ctx: VerifyContext): VerifyResult {
  const found = run(raw, ctx, true);
  const blocking = found.filter((v) => HARD_RULES.includes(v.rule));
  const warnings = found.filter((v) => !HARD_RULES.includes(v.rule));
  return { ok: blocking.length === 0, blocking, warnings };
}
