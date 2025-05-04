import type { PlayerAttributes } from "@/types/player"

export function calculateOverall(attributes: Partial<PlayerAttributes>, performanceHistory: any[] = []): number {
  // Get the latest attributes, combining current and historical data
  const latestAttributes = { ...attributes };
  
  // Consider historical performance for overall calculation
  if (performanceHistory?.length > 0) {
    const latestPerformance = performanceHistory[performanceHistory.length - 1]?.attributes || {};
    Object.keys(latestAttributes).forEach(key => {
      if (latestPerformance[key]) {
        latestAttributes[key] = (latestAttributes[key] + latestPerformance[key]) / 2;
      }
    });
  }

  const weights = {
    shooting: 0.15,
    pace: 0.15,
    positioning: 0.15,
    passing: 0.15,
    ballControl: 0.15,
    crossing: 0.15,
    sessionRating: 0.1
  };

  let total = 0;
  let weightSum = 0;

  for (const [attr, weight] of Object.entries(weights)) {
    if (latestAttributes[attr as keyof typeof latestAttributes] !== undefined) {
      const value = latestAttributes[attr as keyof typeof latestAttributes];
      if (typeof value === 'number') {
        total += value * weight;
        weightSum += weight;
      }
    }
  }

  return weightSum > 0 ? Math.round((total / weightSum) * 10) / 10 : 0;
}

export function calculateAveragePerformance(performanceHistory: any[]): number {
  if (!Array.isArray(performanceHistory) || performanceHistory.length === 0) {
    return 0;
  }

  const validEntries = performanceHistory.filter(entry => {
    const attrs = entry?.attributes || {};
    return attrs.sessionRating || attrs.rating || entry?.rating;
  });

  if (validEntries.length === 0) return 0;

  const sum = validEntries.reduce((acc, entry) => {
    const attrs = entry?.attributes || {};
    const rating = attrs.sessionRating || attrs.rating || entry?.rating || 0;
    return acc + rating;
  }, 0);

  return Math.round((sum / validEntries.length) * 10) / 10;
}

