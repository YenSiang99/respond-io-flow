import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { loadFlowStateSyncFromLocalStorageOrSeed } from '@/api/flowPersistence.js'
import {
  ensureDateTimeBranchConnectors,
  findBranchConnectorId,
  getStepById,
  stepsToFlowNodesAndEdges,
  isBranchConnectorStep,
  newStepsFromForm,
  suggestNodePosition,
} from '@/flow/vueFlowStepsAdapter.js'

function cloneList(list) {
  return JSON.parse(JSON.stringify(list))
}

function isBusinessHoursNode(n) {
  return n?.type === 'dateTime' && n?.data?.action === 'businessHours'
}

export const useFlowStore = defineStore('flow', () => {
  const boot = loadFlowStateSyncFromLocalStorageOrSeed()
  const steps = ref(cloneList(boot.steps))
  /** @type {import('vue').Ref<Record<string, { x: number, y: number }>>} */
  const positions = ref({ ...boot.positions })

  const flowView = computed(() => {
    const m = new Map()
    for (const [k, v] of Object.entries(positions.value)) {
      m.set(k, v)
    }
    return stepsToFlowNodesAndEdges(steps.value, m)
  })

  /**
   * Replace canvas state from an external payload (e.g. Query cache or imports).
   * @param {{ steps: unknown[], positions?: Record<string, { x: number, y: number }> }} payload
   */
  function replaceFlowState(payload) {
    steps.value = cloneList(payload.steps)
    positions.value = { ...(payload.positions || {}) }
  }

  function setNodePosition(id, pos) {
    if (!id || !pos) return
    const next = { ...positions.value, [String(id)]: { x: pos.x, y: pos.y } }
    positions.value = next
  }

  /**
   * @param {import('@vue-flow/core').Connection} c
   */
  function applyConnect(c) {
    const { source, target, sourceHandle } = c
    if (!source || !target || source === target) return
    const list = steps.value
    const t = getStepById(list, target)
    if (!t || t.type === 'trigger' || isBranchConnectorStep(t)) return
    const s = getStepById(list, source)
    if (!s || isBranchConnectorStep(s)) return
    if (isBusinessHoursNode(s)) {
      const branch = sourceHandle === 'failure' ? 'failure' : 'success'
      let cid = findBranchConnectorId(list, s.id, branch)
      if (!cid) {
        ensureDateTimeBranchConnectors(list, s.id)
        cid = findBranchConnectorId(steps.value, s.id, branch)
      }
      if (!cid) return
      t.parentId = cid
    } else {
      t.parentId = s.id
    }
    steps.value = [...steps.value]
  }

  /** @param {string|number} targetId */
  function clearIncomingEdge(targetId) {
    const t = getStepById(steps.value, targetId)
    if (!t || t.type === 'trigger') return
    t.parentId = null
    steps.value = [...steps.value]
  }

  function addFromCreate(formType, title, description) {
    const newSteps = newStepsFromForm(formType, title, description)
    const main = newSteps[0]
    if (!main) return
    steps.value = steps.value.concat(newSteps)
    const m = new Map()
    for (const [k, v] of Object.entries(positions.value)) m.set(k, v)
    const pos = suggestNodePosition(stepsToFlowNodesAndEdges(steps.value, m).nodes)
    if (!isBranchConnectorStep(main)) {
      setNodePosition(String(main.id), pos)
    }
  }

  /**
   * @param {string|number} id
   * @param {(d: object) => void} fn
   */
  function patchNode(id, fn) {
    const n = getStepById(steps.value, id)
    if (!n) return
    fn(n)
    steps.value = [...steps.value]
  }

  /**
   * @param {string|number} id
   */
  function removeNode(id) {
    const n = getStepById(steps.value, id)
    if (!n) return
    if (isBranchConnectorStep(n)) return
    if (n.type === 'trigger') return

    const toRemove = new Set([String(id)])
    if (isBusinessHoursNode(n) && Array.isArray(n.data?.connectors)) {
      for (const c of n.data.connectors) toRemove.add(String(c))
    }

    const list = steps.value.filter((x) => !toRemove.has(String(x.id)))

    for (const x of list) {
      if (x.parentId == null) continue
      if (toRemove.has(String(x.parentId))) {
        x.parentId = null
      }
    }

    steps.value = list
    const p = { ...positions.value }
    for (const rid of toRemove) {
      delete p[rid]
    }
    positions.value = p
  }

  return {
    steps,
    positions,
    flowView,
    replaceFlowState,
    setNodePosition,
    applyConnect,
    clearIncomingEdge,
    addFromCreate,
    patchNode,
    removeNode,
  }
})
