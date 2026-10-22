// Shared contract for generation enforcement and public plan descriptions.
export const STUDY_PLANS = { free: 3, plus: 6, windowSeconds: 600 } as const;
export function generationAllowance(paid: boolean) {
  return paid ? STUDY_PLANS.plus : STUDY_PLANS.free;
}
