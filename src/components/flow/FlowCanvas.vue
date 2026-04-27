<script setup>
import { markRaw, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, ConnectionMode } from '@vue-flow/core'
import FlowNode from './FlowNode.vue'
import { useFlowStore } from '@/stores/flow'
import { getStepById, isBranchConnectorStep } from '@/flow/vueFlowStepsAdapter.js'

const nodeTypes = { flow: markRaw(FlowNode) }
const store = useFlowStore()
const route = useRoute()
const router = useRouter()

const nodes = ref([])
const edges = ref([])

/** When true, ignore @edges-change so store-driven updates do not clear parent links. */
const syncingFromStore = ref(false)

watch(
  () => [store.steps, store.positions],
  () => {
    const { nodes: n, edges: e } = store.flowView
    syncingFromStore.value = true
    nodes.value = n
    edges.value = e
    nextTick(() => {
      nextTick(() => {
        syncingFromStore.value = false
      })
    })
  },
  { deep: true, immediate: true },
)

/**
 * @param {import('@vue-flow/core').Connection} c
 */
function handleConnect(c) {
  store.applyConnect(c)
}

function validConnection(c) {
  const { source, target, sourceHandle } = c
  if (!source || !target || source === target) return false
  const t = getStepById(store.steps, target)
  if (!t || t.type === 'trigger' || isBranchConnectorStep(t)) return false
  const s = getStepById(store.steps, source)
  if (!s || isBranchConnectorStep(s)) return false
  if (s.type === 'dateTime' && s.data?.action === 'businessHours') {
    return sourceHandle === 'success' || sourceHandle === 'failure'
  }
  return sourceHandle === 'out' || sourceHandle == null
}

function handleEdgesChange(changes) {
  if (syncingFromStore.value) return
  for (const c of changes) {
    if (c.type === 'remove' && 'target' in c) {
      store.clearIncomingEdge(c.target)
    }
  }
}

/**
 * Keyboard / UI node deletes update Vue Flow's local `nodes` first; mirror removals into Pinia
 * so the store (and persistence) stay in sync — otherwise the next `watch` refresh resurrects nodes.
 * @param {import('@vue-flow/core').NodeChange[]} changes
 */
function handleNodesChange(changes) {
  if (syncingFromStore.value) return
  for (const c of changes) {
    if (c.type !== 'remove' || !('id' in c)) continue
    const sid = String(c.id)
    store.removeNode(sid)
    if (String(route.query.node) === sid) {
      const { node: _n, ...rest } = route.query
      void _n
      router.replace({ name: 'home', query: rest })
    }
  }
}

function onNodeDragStopEvent(ev) {
  const n = ev.node
  if (n?.id) {
    store.setNodePosition(n.id, n.position)
  }
}

function onNodeClickEvent(ev) {
  const id = ev.node?.id
  if (id == null) return
  const step = getStepById(store.steps, id)
  if (step?.type === 'trigger') return
  const sid = String(id)
  if (String(route.query.node) === sid) {
    const { node: _n, ...rest } = route.query
    void _n
    router.replace({ name: 'home', query: rest })
  } else {
    router.push({ name: 'home', query: { ...route.query, node: sid } })
  }
}
</script>

<template>
  <div class="flow-canvas">
    <div class="flow-canvas__stage">
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        :fit-view-on-init="true"
        :nodes-draggable="true"
        :nodes-connectable="true"
        :is-valid-connection="validConnection"
        :connection-mode="ConnectionMode.Strict"
        :elements-selectable="true"
        :zoom-on-scroll="true"
        :pan-on-scroll="true"
        :min-zoom="0.2"
        :max-zoom="2"
        :delete-key-code="['Backspace', 'Delete']"
        class="flow-canvas__vue"
        @connect="handleConnect"
        @nodes-change="handleNodesChange"
        @edges-change="handleEdgesChange"
        @node-drag-stop="onNodeDragStopEvent"
        @node-click="onNodeClickEvent"
      />
    </div>
  </div>
</template>

<style scoped>
.flow-canvas {
  display: flex;
  min-height: calc(100vh - 120px);
  width: 100%;
  gap: 0;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  background: var(--flow-pane-bg, #f6f7fa);
}

.flow-canvas__stage {
  flex: 1;
  min-width: 0;
  min-height: 480px;
  position: relative;
  height: calc(100vh - 120px);
}
</style>

<style>
.flow-canvas__vue {
  width: 100%;
  height: 100%;
}

/* Vue Flow pane fills the container */
.flow-canvas__vue .vue-flow {
  width: 100%;
  height: 100%;
  background: #f6f7fa;
}
</style>
