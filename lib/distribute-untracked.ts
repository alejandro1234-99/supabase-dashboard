/**
 * Distribute untracked values proportionally among tracked sources.
 * Uses largest-remainder rounding so the sum always equals total exactly.
 *
 * Each phase (leads, agendas, ventas) must be distributed independently
 * because each has its own coefficient.
 */

type Entry = { key: string; value: number };

/**
 * Distribute `untrackedValue` proportionally among `tracked` entries.
 * Returns adjusted values that sum to exactly `trackedSum + untrackedValue`.
 */
export function distribute(tracked: Entry[], untrackedValue: number): { key: string; adjusted: number }[] {
  const trackedSum = tracked.reduce((s, e) => s + e.value, 0);
  const total = trackedSum + untrackedValue;

  if (trackedSum === 0) {
    // Cannot distribute — all is untracked
    return tracked.map((e) => ({ key: e.key, adjusted: 0 }));
  }

  const coefficient = total / trackedSum;

  // Calculate float values
  const floats = tracked.map((e) => ({
    key: e.key,
    exact: e.value * coefficient,
    floor: Math.floor(e.value * coefficient),
    remainder: (e.value * coefficient) % 1,
  }));

  // Largest-remainder rounding
  const floorSum = floats.reduce((s, f) => s + f.floor, 0);
  let remaining = total - floorSum;

  // Sort by remainder descending to distribute the remaining units
  const sorted = [...floats].sort((a, b) => b.remainder - a.remainder);
  for (const f of sorted) {
    if (remaining <= 0) break;
    f.floor += 1;
    remaining -= 1;
  }

  return floats.map((f) => ({ key: f.key, adjusted: f.floor }));
}

/**
 * Distribute untracked across multiple independent phases.
 * Each phase (e.g. leads, agendas, ventas) gets its own coefficient.
 */
export function distributeMultiPhase(
  sources: { key: string; leads: number; agendas: number; ventas: number }[],
  untrackedKey = "Untracked"
): { key: string; adjLeads: number; adjAgendas: number; adjVentas: number }[] {
  const tracked = sources.filter((s) => s.key !== untrackedKey && s.key !== "untracked");
  const untracked = sources.find((s) => s.key === untrackedKey || s.key === "untracked");
  if (!untracked) {
    return tracked.map((s) => ({ key: s.key, adjLeads: s.leads, adjAgendas: s.agendas, adjVentas: s.ventas }));
  }

  const adjLeads = distribute(
    tracked.map((s) => ({ key: s.key, value: s.leads })),
    untracked.leads
  );
  const adjAgendas = distribute(
    tracked.map((s) => ({ key: s.key, value: s.agendas })),
    untracked.agendas
  );
  const adjVentas = distribute(
    tracked.map((s) => ({ key: s.key, value: s.ventas })),
    untracked.ventas
  );

  return tracked.map((s) => ({
    key: s.key,
    adjLeads: adjLeads.find((a) => a.key === s.key)?.adjusted ?? s.leads,
    adjAgendas: adjAgendas.find((a) => a.key === s.key)?.adjusted ?? s.agendas,
    adjVentas: adjVentas.find((a) => a.key === s.key)?.adjusted ?? s.ventas,
  }));
}

/**
 * Simple single-value distribution for sub-breakdowns (Paid campaigns, Affiliates).
 * Distributes one metric at a time.
 */
export function distributeSingle(tracked: Entry[], untrackedValue: number): { key: string; adjusted: number }[] {
  return distribute(tracked, untrackedValue);
}
