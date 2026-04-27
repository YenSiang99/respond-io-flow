/**
 * The app stores the automation as a flat `steps` array (triggers, messages, …).
 * Vue Flow needs `nodes` and `edges` in its shape. This module maps between the two
 * and holds shared helpers for reading and extending the step list.
 */
const LANE_X = 56
const LANE_GAP_X = 260
const ROW_GAP_Y = 120

const WEEKDAY_DEFAULTS = [
  { startTime: '09:00', endTime: '17:00', day: 'mon' },
  { startTime: '09:00', endTime: '17:00', day: 'tue' },
  { startTime: '09:00', endTime: '17:00', day: 'wed' },
  { startTime: '09:00', endTime: '17:00', day: 'thu' },
  { startTime: '09:00', endTime: '17:00', day: 'fri' },
  { startTime: '09:00', endTime: '17:00', day: 'sat' },
  { startTime: '09:00', endTime: '17:00', day: 'sun' },
]

/** Success/failure routing steps (`dateTimeConnector`) are not full cards; they only route lines. */
export function isBranchConnectorStep(n) {
  return n?.type === 'dateTimeConnector'
}

/**
 * @param {object[]} steps
 * @param {string|number} id
 */
export function getStepById(steps, id) {
  return steps.find((n) => String(n.id) === String(id))
}

/**
 * @param {object[]} steps
 * @param {string|number} businessHoursId
 * @param {'success' | 'failure'} branch
 * @returns {string | null}
 */
export function findBranchConnectorId(steps, businessHoursId, branch) {
  const bh = getStepById(steps, businessHoursId)
  if (!bh?.data?.connectors?.length) return null
  for (const cid of bh.data.connectors) {
    const c = getStepById(steps, cid)
    if (c && isBranchConnectorStep(c) && c.data?.connectorType === branch) {
      return String(c.id)
    }
  }
  return null
}

/**
 * Ensures a business-hours `dateTime` node has success/failure connector children in the list.
 * @param {object[]} steps — mutated in place
 * @param {string|number} businessHoursId
 */
export function ensureDateTimeBranchConnectors(steps, businessHoursId) {
  const bh = getStepById(steps, businessHoursId)
  if (!bh || bh.type !== 'dateTime' || bh.data?.action !== 'businessHours') return
  if (!Array.isArray(bh.data.connectors)) bh.data.connectors = []
  if (bh.data.connectors.length >= 2) return

  const successId = crypto.randomUUID()
  const failureId = crypto.randomUUID()
  bh.data.connectors = [successId, failureId]
  steps.push(
    {
      id: successId,
      type: 'dateTimeConnector',
      parentId: bh.id,
      name: 'Success',
      data: { connectorType: 'success' },
    },
    {
      id: failureId,
      type: 'dateTimeConnector',
      parentId: bh.id,
      name: 'Failure',
      data: { connectorType: 'failure' },
    },
  )
}

/**
 * @param {object} step
 * @param {string} [step.name]
 * @param {string|number} step.id
 * @param {string} step.type
 */
export function titleForStep(step) {
  if (step.name) return step.name
  if (step.type === 'trigger') return 'Trigger'
  return step.type
}

/**
 * @param {object} step
 * @param {object} [step.data]
 */
export function summaryForStep(step) {
  const d = step.data
  if (!d) return ''
  if (step.type === 'trigger') {
    if (d.type === 'conversationOpened') return 'Conversation Opened'
    return ''
  }
  if (typeof d.comment === 'string') return d.comment
  if (Array.isArray(d.payload)) {
    const t = d.payload.find((p) => p.type === 'text')
    if (t?.text) return t.text
    const att = d.payload.find((p) => p.type === 'attachment')
    if (att?.attachment) {
      try {
        const u = String(att.attachment)
        const seg = u.split('/').pop() || u
        return decodeURIComponent(seg.split('?')[0] || seg)
      } catch {
        return String(att.attachment)
      }
    }
  }
  if (d.action === 'businessHours' && Array.isArray(d.times)) {
    return `Business Hours · ${d.timezone || 'UTC'}`
  }
  return ''
}

/**
 * @param {object[]} steps
 * @param {object} n
 * @returns {string | number | null}
 */
function effectiveParentIdForLayout(steps, n) {
  if (n.parentId == null || n.parentId === -1) return null
  const p = getStepById(steps, n.parentId)
  if (!p) return n.parentId
  if (isBranchConnectorStep(p)) return p.parentId ?? null
  return n.parentId
}

/**
 * Top-down tree layout: parents above children, siblings spread horizontally.
 * Connector steps are skipped; edges still route through them.
 * @param {object[]} steps
 * @returns {Map<string, { x: number, y: number }>}
 */
function layoutVerticalTree(steps) {
  const visible = steps.filter((n) => !isBranchConnectorStep(n))
  /** @type {Map<string, object[]>} */
  const childrenByParent = new Map()
  for (const n of visible) {
    const ep = effectiveParentIdForLayout(steps, n)
    if (ep == null) continue
    const k = String(ep)
    if (!childrenByParent.has(k)) childrenByParent.set(k, [])
    childrenByParent.get(k).push(n)
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => String(a.id).localeCompare(String(b.id)))
  }

  const roots = visible.filter((n) => effectiveParentIdForLayout(steps, n) == null)
  const pos = new Map()
  const rootX = LANE_X + LANE_GAP_X
  const startY = 48

  /**
   * @param {object} n
   * @param {number} x
   * @param {number} y
   * @returns {number} bottom Y of this subtree
   */
  function place(n, x, y) {
    pos.set(String(n.id), { x, y })
    const ch = childrenByParent.get(String(n.id)) || []
    if (ch.length === 0) return y + ROW_GAP_Y
    const childY = y + ROW_GAP_Y
    if (ch.length === 1) {
      return place(ch[0], x, childY)
    }
    const spread = LANE_GAP_X
    const totalOffset = (ch.length - 1) * spread
    const startX = x - totalOffset / 2
    let maxBottom = childY
    for (let i = 0; i < ch.length; i++) {
      const bottom = place(ch[i], startX + i * spread, childY)
      if (bottom > maxBottom) maxBottom = bottom
    }
    return maxBottom
  }

  let yCursor = startY
  for (const r of roots) {
    const bottom = place(r, rootX, yCursor)
    yCursor = bottom + Math.floor(ROW_GAP_Y / 2)
  }
  return pos
}

/**
 * One step that has a parent: how the Vue Flow `Edge` should connect (source → target, handles, label).
 * @param {object[]} steps
 * @param {object} child — step with a parent
 * @returns {{ source: string, target: string, label?: string, sourceHandle?: string, targetHandle?: string }}
 */
function flowConnectionForChildStep(steps, child) {
  if (child.parentId == null || child.parentId === -1) {
    return { source: '', target: String(child.id) }
  }
  const p = getStepById(steps, child.parentId)
  if (!p) return { source: '', target: String(child.id) }
  if (isBranchConnectorStep(p)) {
    const gp = p.parentId != null ? getStepById(steps, p.parentId) : null
    const branch = p.data?.connectorType === 'failure' ? 'failure' : 'success'
    return {
      source: gp ? String(gp.id) : '',
      target: String(child.id),
      label: branch === 'failure' ? 'Failure' : 'Success',
      sourceHandle: branch,
    }
  }
  return { source: String(p.id), target: String(child.id), sourceHandle: 'out' }
}

const BRANCH_LABEL_STYLE = {
  fill: '#0c4a6e',
  fontSize: 11,
  fontWeight: 600,
}

const BRANCH_LABEL_BG = {
  fill: '#e0f2fe',
  stroke: '#bae6fd',
  strokeWidth: 1,
}

/**
 * Turns our step list + saved positions into what Vue Flow expects: `nodes` and `edges`.
 *
 * @param {object[]} steps
 * @param {Map<string, { x: number, y: number }>} [positionMap] — from Pinia, keyed by step id
 * @returns {{ nodes: import('@vue-flow/core').Node[], edges: import('@vue-flow/core').Edge[] }}
 */
export function stepsToFlowNodesAndEdges(steps, positionMap) {
  const layoutPos = layoutVerticalTree(steps)
  const visible = steps.filter((n) => !isBranchConnectorStep(n))
  const nodes = visible.map((n) => {
    const id = String(n.id)
    const fromMap = positionMap?.get(id)
    const fromLayout = layoutPos.get(id) || { x: 0, y: 0 }
    return {
      id,
      type: 'flow',
      position: fromMap || fromLayout,
      selectable: n.type !== 'trigger',
      deletable: n.type !== 'trigger',
      data: {
        step: n,
        label: titleForStep(n),
        description: summaryForStep(n),
      },
    }
  })

  const edges = visible
    .filter((n) => n.parentId != null && n.parentId !== -1)
    .map((n) => {
      const { source, target, label, sourceHandle } = flowConnectionForChildStep(steps, n)
      if (!source) return null
      const id = `e-${source}-${target}`
      const edge = {
        id,
        source,
        target,
        sourceHandle: sourceHandle || undefined,
        targetHandle: 'in',
        deletable: true,
        focusable: true,
      }
      if (label) {
        edge.label = label
        edge.labelShowBg = true
        edge.labelStyle = BRANCH_LABEL_STYLE
        edge.labelBgStyle = BRANCH_LABEL_BG
        edge.labelBgPadding = [8, 4]
        edge.labelBgBorderRadius = 999
      }
      return edge
    })
    .filter(Boolean)

  return { nodes, edges }
}

/**
 * @param {'sendMessage' | 'addComment' | 'businessHours'} formType
 * @param {string} title
 * @param {string} description
 * @param {string} [id]
 * @returns {object[]}
 */
export function newStepsFromForm(formType, title, description, id) {
  const newId = id || crypto.randomUUID()
  if (formType === 'sendMessage') {
    return [
      {
        id: newId,
        name: title,
        type: 'sendMessage',
        parentId: null,
        data: {
          description,
          payload: description ? [{ type: 'text', text: description }] : [],
        },
      },
    ]
  }
  if (formType === 'addComment') {
    return [
      {
        id: newId,
        name: title,
        type: 'addComment',
        parentId: null,
        data: {
          description,
          comment: description,
        },
      },
    ]
  }
  if (formType === 'businessHours') {
    const bhId = newId
    const successId = crypto.randomUUID()
    const failureId = crypto.randomUUID()
    return [
      {
        id: bhId,
        name: title,
        type: 'dateTime',
        parentId: null,
        data: {
          description,
          times: structuredClone(WEEKDAY_DEFAULTS),
          connectors: [successId, failureId],
          timezone: 'UTC',
          action: 'businessHours',
        },
      },
      {
        id: successId,
        type: 'dateTimeConnector',
        parentId: bhId,
        name: 'Success',
        data: { connectorType: 'success' },
      },
      {
        id: failureId,
        type: 'dateTimeConnector',
        parentId: bhId,
        name: 'Failure',
        data: { connectorType: 'failure' },
      },
    ]
  }
  throw new Error(`Unknown form type: ${formType}`)
}

/**
 * Picks a free position to the right-below the current canvas nodes (Vue Flow node objects).
 * @param { { position: { x: number, y: number } }[] } existingNodes
 */
export function suggestNodePosition(existingNodes) {
  let maxX = 0
  let maxY = 0
  for (const n of existingNodes) {
    const { x, y } = n.position
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { x: maxX + 40, y: maxY + 40 }
}

/**
 * @param {object} step — one automation step
 * @param {{ x: number, y: number}} position
 * @returns {import('@vue-flow/core').Node}
 */
export function stepToFlowNode(step, position) {
  return {
    id: String(step.id),
    type: 'flow',
    position,
    data: {
      step,
      label: titleForStep(step),
      description: summaryForStep(step),
    },
  }
}
