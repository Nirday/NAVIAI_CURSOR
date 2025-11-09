export interface PlanLimits {
  maxPages: number
}

export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
  // Placeholder: fetch from billing in Module 9. For V1, basic plan.
  return { maxPages: 5 }
}
