
// abTestManager.ts
type ExperimentGroup = "A" | "B";

export function getExperimentGroup(userId: string): ExperimentGroup {
  // Very basic: hash the userId to split A/B
  return parseInt(userId.slice(-1), 16) % 2 === 0 ? "A" : "B";
}
