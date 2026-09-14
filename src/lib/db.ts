import { get, set, del } from "idb-keyval";
import { RawPricingRow, SimulationRule } from "./types";

const KEY_RAW_ROWS = "ev_pricing_raw_rows";
const KEY_RULES = "ev_pricing_sim_rules";
const KEY_OVERRIDES = "ev_pricing_manual_overrides";
const KEY_METADATA = "ev_pricing_metadata";

export interface StoredMetadata {
  filename?: string;
  rowCount: number;
  importedAt: string;
}

export async function saveRawRows(rows: RawPricingRow[], filename?: string): Promise<void> {
  await set(KEY_RAW_ROWS, rows);
  const meta: StoredMetadata = {
    filename: filename || "Musterdatensatz Ernesto Vargas",
    rowCount: rows.length,
    importedAt: new Date().toISOString()
  };
  await set(KEY_METADATA, meta);
}

export async function loadRawRows(): Promise<RawPricingRow[] | null> {
  try {
    const data = await get<RawPricingRow[]>(KEY_RAW_ROWS);
    return data || null;
  } catch {
    return null;
  }
}

export async function loadMetadata(): Promise<StoredMetadata | null> {
  try {
    return (await get<StoredMetadata>(KEY_METADATA)) || null;
  } catch {
    return null;
  }
}

export async function saveSimulationRules(rules: SimulationRule[]): Promise<void> {
  await set(KEY_RULES, rules);
}

export async function loadSimulationRules(): Promise<SimulationRule[] | null> {
  try {
    return (await get<SimulationRule[]>(KEY_RULES)) || null;
  } catch {
    return null;
  }
}

export async function saveManualOverrides(overrides: Record<string, number>): Promise<void> {
  await set(KEY_OVERRIDES, overrides);
}

export async function loadManualOverrides(): Promise<Record<string, number> | null> {
  try {
    return (await get<Record<string, number>>(KEY_OVERRIDES)) || null;
  } catch {
    return null;
  }
}

export async function clearAllStoredData(): Promise<void> {
  await del(KEY_RAW_ROWS);
  await del(KEY_RULES);
  await del(KEY_OVERRIDES);
  await del(KEY_METADATA);
}
