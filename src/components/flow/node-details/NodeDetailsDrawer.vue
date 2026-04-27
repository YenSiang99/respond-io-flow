<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useFlowStore } from '@/stores/flow'
import { getStepById, isBranchConnectorStep } from '@/flow/vueFlowStepsAdapter.js'

const store = useFlowStore()
const { steps } = storeToRefs(store)
const route = useRoute()
const router = useRouter()

const open = computed(() => {
  const id = route.query.node
  return id != null && id !== ''
})

const nodeId = computed(() => {
  const id = route.query.node
  return id != null && id !== '' ? String(id) : null
})

const node = computed(() => {
  if (!nodeId.value) return null
  return getStepById(steps.value, nodeId.value)
})

const isConnector = computed(() => (node.value ? isBranchConnectorStep(node.value) : false))
const isTrigger = computed(() => node.value?.type === 'trigger')

const title = ref('')
const description = ref('')
const comment = ref('')

const bhTimes = ref([])

function syncFormFromNode() {
  const n = node.value
  if (!n) return
  title.value = n.name || (n.data?.name ?? '') || ''
  if (n.type === 'addComment') {
    comment.value = n.data?.comment != null ? String(n.data.comment) : ''
  } else {
    comment.value = ''
  }
  if (n.type === 'dateTime' && n.data?.action === 'businessHours' && Array.isArray(n.data.times)) {
    bhTimes.value = n.data.times.map((t) => ({
      day: t.day,
      startTime: t.startTime || '09:00',
      endTime: t.endTime || '17:00',
    }))
  } else {
    bhTimes.value = []
  }
  if (n.type === 'sendMessage' || n.type === 'addComment' || n.type === 'dateTime') {
    description.value = n.data?.description != null ? String(n.data.description) : ''
  } else if (n.type === 'trigger') {
    description.value = ''
  } else {
    description.value = n.data?.description != null ? String(n.data.description) : ''
  }
}

watch(
  [nodeId, node],
  () => {
    syncFormFromNode()
  },
  { immediate: true, deep: true },
)

const textValue = ref('')

function syncTextFromPayload() {
  if (node.value?.type !== 'sendMessage') {
    textValue.value = ''
    return
  }
  const p = node.value.data?.payload
  if (!Array.isArray(p)) {
    textValue.value = ''
    return
  }
  const textParts = p
    .filter((i) => i && i.type === 'text' && i.text)
    .map((i) => i.text)
  textValue.value = textParts.join('\n\n')
}

watch(
  node,
  () => {
    syncTextFromPayload()
  },
  { immediate: true, deep: true },
)

function applyTitle() {
  if (!node.value) return
  if (isConnector.value) return
  const v = title.value.trim()
  store.patchNode(node.value.id, (n) => {
    n.name = v
  })
}

function applyDescription() {
  if (!node.value) return
  if (isConnector.value || isTrigger.value) return
  store.patchNode(node.value.id, (n) => {
    if (!n.data) n.data = {}
    n.data.description = description.value
  })
}

function applyComment() {
  if (!node.value || node.value.type !== 'addComment') return
  store.patchNode(node.value.id, (n) => {
    if (!n.data) n.data = {}
    n.data.comment = comment.value
  })
}

function applyTextPayload() {
  if (!node.value || node.value.type !== 'sendMessage') return
  const text = textValue.value
  let payload = Array.isArray(node.value.data?.payload) ? [...node.value.data.payload] : []
  const nonText = payload.filter((i) => i && i.type !== 'text')
  if (text.trim()) {
    nonText.unshift({ type: 'text', text })
  }
  store.patchNode(node.value.id, (n) => {
    if (!n.data) n.data = {}
    n.data.payload = nonText
  })
}

function removeAttachmentAtPayloadIndex(payloadIndex) {
  if (!node.value || node.value.type !== 'sendMessage' || payloadIndex < 0) return
  const payload = [...(node.value.data?.payload || [])]
  if (payloadIndex >= payload.length) return
  payload.splice(payloadIndex, 1)
  store.patchNode(node.value.id, (n) => {
    if (!n.data) n.data = {}
    n.data.payload = payload
  })
}

function onFilePick(e) {
  const file = e?.target?.files?.[0]
  const id = node.value?.id
  if (!file || id == null) return
  if (node.value?.type !== 'sendMessage') return
  const reader = new FileReader()
  reader.onload = () => {
    const u = String(reader.result || '')
    if (!u) return
    store.patchNode(id, (n) => {
      if (n.type !== 'sendMessage') return
      const payload = [...(n.data?.payload || [])]
      payload.push({ type: 'attachment', attachment: u })
      if (!n.data) n.data = {}
      n.data.payload = payload
    })
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function applyBhSlot(i) {
  if (!node.value || !node.value.data) return
  const row = bhTimes.value[i]
  if (!row) return
  store.patchNode(node.value.id, (n) => {
    if (!n.data) n.data = {}
    if (!Array.isArray(n.data.times)) n.data.times = []
    n.data.times[i] = { ...n.data.times[i], ...row }
  })
}

const dayLabel = (d) => {
  const m = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
  return m[d] || d
}

function close() {
  const { node: _n, ...rest } = route.query
  void _n
  router.replace({ name: 'home', query: rest })
}

function onDelete() {
  if (!nodeId.value) return
  if (isTrigger.value || isConnector.value) return
  store.removeNode(nodeId.value)
  close()
}

const attachmentPreviews = computed(() => {
  if (node.value?.type !== 'sendMessage') return []
  const p = node.value.data?.payload
  if (!Array.isArray(p)) return []
  const out = []
  p.forEach((i, j) => {
    if (i && (i.type === 'attachment' || typeof i.attachment === 'string') && i.attachment) {
      out.push({ url: i.attachment, name: `Attachment ${out.length + 1}`, payloadIndex: j })
    }
  })
  return out
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-root" aria-modal="true" role="dialog">
        <div class="drawer-backdrop" @click="close" />
        <aside
          v-if="open"
          class="drawer"
          :aria-labelledby="`node-drawer-title-${String(nodeId)}`"
        >
          <div class="drawer__head">
            <h2 :id="`node-drawer-title-${String(nodeId)}`" class="drawer__h">Node details</h2>
            <button type="button" class="drawer__close" aria-label="Close" @click="close">×</button>
          </div>
          <div v-if="open && !node" class="drawer__body">
            <p class="field__hint">No node exists for <code>{{ nodeId }}</code>.</p>
            <button type="button" class="btn" @click="close">Close</button>
          </div>
          <div v-else-if="node && isConnector" class="drawer__section drawer__section--mute">
            <p>
              This Success / Failure connector is only used for layout. It is not editable
              directly&mdash;connect to the <strong>Business hours</strong> node instead.
            </p>
            <button type="button" class="btn" @click="close">OK</button>
          </div>
          <div v-else-if="node" class="drawer__body">
            <label class="field">
              <span class="field__label">Title</span>
              <input
                v-model="title"
                :disabled="isTrigger"
                class="field__input"
                @change="applyTitle"
                @blur="applyTitle"
              />
            </label>
            <label
              v-if="node.type !== 'dateTime' && node.type !== 'trigger' && !isConnector"
              class="field"
            >
              <span class="field__label">Description</span>
              <textarea
                v-model="description"
                class="field__input field__input--area"
                :disabled="isTrigger"
                @change="applyDescription"
                @blur="applyDescription"
              />
            </label>
            <label
              v-else-if="node.type === 'dateTime' && node.data?.action === 'businessHours'"
              class="field"
            >
              <span class="field__label">Description</span>
              <textarea
                v-model="description"
                class="field__input field__input--area"
                @change="applyDescription"
                @blur="applyDescription"
              />
            </label>

            <div v-if="node.type === 'sendMessage'" class="drawer__section">
              <h3 class="drawer__sub">Message text</h3>
              <label class="field">
                <span class="field__label">Text</span>
                <textarea
                  v-model="textValue"
                  class="field__input field__input--area"
                  @change="applyTextPayload"
                  @blur="applyTextPayload"
                />
              </label>
            </div>

            <div v-if="node.type === 'sendMessage' && attachmentPreviews.length" class="drawer__section">
              <h3 class="drawer__sub">Attachments</h3>
              <ul class="tile-list">
                <li
                  v-for="(a, ai) in attachmentPreviews"
                  :key="a.payloadIndex + '-' + ai"
                  class="tile"
                >
                  <img
                    v-if="a.url.startsWith('data:image/') || /\.(jpe?g|png|gif|webp)($|\?)/i.test(a.url)"
                    :src="a.url"
                    :alt="a.name"
                    class="tile__img"
                  />
                  <div v-else class="tile__box">File / URL</div>
                  <span class="tile__name">{{ a.name }}</span>
                  <button
                    type="button"
                    class="tile__rm"
                    @click="removeAttachmentAtPayloadIndex(a.payloadIndex)"
                  >
                    Remove
                  </button>
                </li>
              </ul>
            </div>
            <div v-if="node.type === 'sendMessage'" class="field">
              <span class="field__label">Upload</span>
              <input class="file-in" type="file" accept="image/*" @change="onFilePick" />
            </div>

            <div v-if="node.type === 'addComment'" class="field">
              <span class="field__label">Comment</span>
              <textarea
                v-model="comment"
                class="field__input field__input--area"
                @change="applyComment"
                @blur="applyComment"
              />
            </div>

            <div
              v-if="node.type === 'dateTime' && node.data?.action === 'businessHours'"
              class="drawer__section"
            >
              <h3 class="drawer__sub">Business hours &amp; calendar</h3>
              <p v-if="node.data?.timezone" class="field__hint">Timezone: {{ node.data.timezone }}</p>
              <div v-for="(row, i) in bhTimes" :key="row.day + i" class="bh-row" @change="applyBhSlot(i)">
                <span class="bh-day">{{ dayLabel(row.day) }}</span>
                <div class="bh-times">
                  <input v-model="row.startTime" class="time-in" type="time" required />
                  <span class="sep">-</span>
                  <input v-model="row.endTime" class="time-in" type="time" required />
                </div>
              </div>
              <p class="field__hint">
                Success and Failure follow-up nodes are not opened here&mdash;they are shown on the
                main flow and branch from the Business hours card.
              </p>
            </div>

            <div v-if="!isTrigger && !isConnector" class="drawer__danger">
              <button type="button" class="btn btn--danger" @click="onDelete">Delete node</button>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-root {
  position: fixed;
  inset: 0;
  z-index: 60;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  pointer-events: auto;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: min(100%, 420px);
  height: 100%;
  background: var(--color-background, #fff);
  box-shadow: -4px 0 24px rgba(15, 23, 42, 0.12);
  pointer-events: auto;
  z-index: 61;
  display: flex;
  flex-direction: column;
  font-size: 14px;
  color: var(--color-text, #334155);
  overflow: hidden;
}

.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.drawer__h {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-heading, #0f172a);
}

.drawer__close {
  border: none;
  background: #f1f5f9;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  color: #475569;
}
.drawer__close:hover {
  background: #e2e8f0;
}

.drawer__body {
  padding: 16px 18px;
  overflow: auto;
  flex: 1;
}

.drawer__section {
  margin-top: 1rem;
}

.drawer__section--mute {
  margin: 16px 18px 24px;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.drawer__sub {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading, #0f172a);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 0.9rem;
}

.field__label {
  font-size: 12px;
  font-weight: 500;
}

.field__hint {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 0.75rem;
  line-height: 1.45;
}

/* Light input surface: always use dark text (avoids light --color-text on white in dark mode). */
.field__input,
.time-in,
.file-in {
  color: #0f172a;
  -webkit-text-fill-color: #0f172a;
  caret-color: #0f172a;
  background: #fff;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  padding: 8px 10px;
  font: inherit;
}

.field__input::placeholder,
.time-in::placeholder {
  color: #64748b;
  -webkit-text-fill-color: #64748b;
  opacity: 1;
}

.field__input:disabled,
.time-in:disabled {
  color: #64748b;
  -webkit-text-fill-color: #64748b;
  opacity: 0.9;
}

.field__input--area {
  min-height: 100px;
  resize: vertical;
}

.tile-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tile {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 8px;
  align-items: start;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.tile__img {
  width: 68px;
  height: 52px;
  object-fit: cover;
  border-radius: 4px;
}

.tile__box {
  width: 68px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #64748b;
  background: #e2e8f0;
  border-radius: 4px;
  text-align: center;
  padding: 2px;
}

.tile__name {
  font-size: 12px;
  word-break: break-all;
}

.tile__rm {
  border: none;
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 4px;
  font-size: 12px;
  padding: 4px 6px;
  cursor: pointer;
  align-self: center;
}

.bh-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.bh-day {
  width: 2.2rem;
  font-weight: 500;
  font-size: 12px;
  color: #334155;
}

.bh-times {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.sep {
  color: #94a3b8;
  font-size: 12px;
}

.drawer .file-in {
  font-size: 12px;
  padding: 4px 0;
}

/* Compact time pickers in business-hours rows */
.bh-row .time-in {
  padding: 4px 6px;
  border-radius: 4px;
}

.drawer__danger {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #0f172a;
  -webkit-text-fill-color: #0f172a;
  padding: 8px 12px;
  border-radius: 6px;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

.btn--danger {
  border-color: #fecaca;
  color: #b91c1c;
  background: #fef2f2;
  width: 100%;
  padding: 10px 12px;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 0.2s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  pointer-events: none;
}
.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(8px);
}
</style>
