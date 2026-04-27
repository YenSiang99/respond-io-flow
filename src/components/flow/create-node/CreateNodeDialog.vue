<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import CreateNodeForm from './CreateNodeForm.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'create'])

const formKey = ref(0)

function onEscapeKey(e) {
  if (e.key === 'Escape' && props.open) {
    e.preventDefault()
    close()
  }
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      formKey.value += 1
      document.addEventListener('keydown', onEscapeKey, true)
    } else {
      document.removeEventListener('keydown', onEscapeKey, true)
    }
  },
)

onUnmounted(() => {
  document.removeEventListener('keydown', onEscapeKey, true)
})

function close() {
  emit('update:open', false)
}

function onBackdrop() {
  close()
}

/**
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.description
 * @param {string} p.nodeType
 */
function onCreate(p) {
  emit('create', p)
  emit('update:open', false)
  nextTick(() => {
    formKey.value += 1
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="create-dialog-t">
      <div v-if="open" class="cnd" role="dialog" aria-modal="true" aria-labelledby="cnd-title">
        <div class="cnd__backdrop" @click="onBackdrop" />
        <div class="cnd__panel" @click.stop>
          <header class="cnd__head">
            <h2 id="cnd-title" class="cnd__title">Create new node</h2>
            <button type="button" class="cnd__close" aria-label="Close" @click="close">×</button>
          </header>
          <div class="cnd__body">
            <CreateNodeForm :key="formKey" embedded submit-label="Create node" @create="onCreate" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cnd {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}

.cnd__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  pointer-events: auto;
}

.cnd__panel {
  position: relative;
  z-index: 51;
  width: 100%;
  max-width: 400px;
  max-height: min(90vh, 640px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}

.cnd__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #fafbfc;
}

.cnd__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
}

.cnd__close {
  border: none;
  background: #e2e8f0;
  color: #475569;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.cnd__close:hover {
  background: #cbd5e1;
  color: #0f172a;
}

.cnd__body {
  padding: 16px 16px 18px;
  overflow: auto;
}

.create-dialog-t-enter-active,
.create-dialog-t-leave-active {
  transition: opacity 0.2s ease;
}
.create-dialog-t-enter-active .cnd__panel,
.create-dialog-t-leave-active .cnd__panel {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.create-dialog-t-enter-from,
.create-dialog-t-leave-to {
  opacity: 0;
}
.create-dialog-t-enter-from .cnd__panel,
.create-dialog-t-leave-to .cnd__panel {
  transform: scale(0.98);
  opacity: 0.95;
}
</style>
