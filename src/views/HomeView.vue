<script setup>
import { ref } from 'vue'
import FlowCanvas from '../components/flow/FlowCanvas.vue'
import CreateNodeDialog from '../components/flow/create-node/CreateNodeDialog.vue'
import NodeDetailsDrawer from '../components/flow/node-details/NodeDetailsDrawer.vue'
import { useFlowStore } from '@/stores/flow'
import { useFlowPersistence } from '@/composables/useFlowPersistence'

const createDialogOpen = ref(false)
const store = useFlowStore()
useFlowPersistence()

/**
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.description
 * @param {string} p.nodeType
 */
function onCreateNode(p) {
  store.addFromCreate(p.nodeType, p.title, p.description)
}
</script>

<template>
  <main class="home-main">
    <div class="home-hero">
      <div>
        <h1 class="page-title">Flow</h1>
        <ol class="page-subtitle page-hints">
          <li>Drag nodes to move them on the canvas.</li>
          <li>Connect nodes by dragging from one handle to another.</li>
          <li>
            Open the details panel with a click, or with
            <code class="code-hint">?node=&lt;id&gt;</code> in the URL.
          </li>
          <li>Remove connections with Backspace or Delete, or from the node details.</li>
        </ol>
      </div>
      <button type="button" class="btn-create" @click="createDialogOpen = true">Create new node</button>
    </div>
    <FlowCanvas />
    <CreateNodeDialog v-model:open="createDialogOpen" @create="onCreateNode" />
    <NodeDetailsDrawer />
  </main>
</template>

<style scoped>
.home-main {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}

.home-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  margin-bottom: 0.25rem;
}

.btn-create {
  border: 1px solid #c7d2fe;
  background: #3b6cff;
  color: #fff;
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(59, 108, 255, 0.2);
  flex-shrink: 0;
}

.btn-create:hover {
  background: #2d56cc;
  border-color: #2d56cc;
}

.btn-create:focus-visible {
  outline: 2px solid #3b6cff;
  outline-offset: 2px;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0 0 0.35rem;
  color: var(--color-heading, #2c3e50);
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-text, #2c3e50);
  opacity: 0.75;
  margin: 0 0 0.9rem;
}

.page-hints {
  padding-left: 1.25rem;
  list-style-type: decimal;
}

.page-hints li {
  margin: 0.2rem 0;
}

.page-hints li::marker {
  color: var(--color-text, #2c3e50);
  opacity: 0.5;
  font-weight: 500;
}

.code-hint {
  font-size: 12px;
  background: #f1f5f9;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  color: #0f172a;
}
</style>
