import flowSeedUrl from '@/flow/initialSteps.json?url'
import seedSteps from '@/flow/initialSteps.json'

export const FLOW_STEPS_QUERY_KEY = ['flow', 'steps']

const STORAGE_KEY = 'flowchart-app:flow-payload'

function cloneFlowPayload(list, positions) {
  return {
    steps: JSON.parse(JSON.stringify(list)),
    positions: { ...positions },
  }
}

/**
 * Pulls the steps array from a parsed localStorage payload (supports legacy `graphList`).
 * @param {unknown} parsed
 * @returns {unknown[] | null}
 */
function extractStepsFromStoredObject(parsed) {
  if (!parsed || typeof parsed !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (parsed)
  if (Array.isArray(o.steps)) return o.steps
  if (Array.isArray(o.graphList)) return o.graphList
  return null
}

/** Reads and parses `flowchart-app:flow-payload` from localStorage; returns null if missing or invalid. */
function readFlowPayloadFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const steps = extractStepsFromStoredObject(parsed)
    if (steps) {
      return {
        steps,
        positions:
          parsed.positions && typeof parsed.positions === 'object' ? parsed.positions : {},
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Synchronous Pinia bootstrap: localStorage first, else bundled `initialSteps.json`.
 */
export function loadFlowStateSyncFromLocalStorageOrSeed() {
  const fromStorage = readFlowPayloadFromLocalStorage()
  if (fromStorage) return cloneFlowPayload(fromStorage.steps, fromStorage.positions)
  return cloneFlowPayload(seedSteps, {})
}

/**
 * TanStack Query loader: same data as sync bootstrap — prefers localStorage, otherwise fetches seed JSON.
 * @returns {Promise<{ steps: unknown[], positions: Record<string, { x: number, y: number }> }>}
 */
export async function loadFlowStateAsyncFromLocalStorageOrFetchedSeed() {
  const fromStorage = readFlowPayloadFromLocalStorage()
  if (fromStorage) return cloneFlowPayload(fromStorage.steps, fromStorage.positions)
  const res = await fetch(flowSeedUrl)
  if (!res.ok) throw new Error(`Failed to load flow seed: ${res.status}`)
  const steps = await res.json()
  return cloneFlowPayload(steps, {})
}

/**
 * @param {{ steps: unknown[], positions: Record<string, { x: number, y: number }> }} payload
 */
export async function saveFlowStateToLocalStorage(payload) {
  await Promise.resolve()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  return cloneFlowPayload(payload.steps, payload.positions)
}
