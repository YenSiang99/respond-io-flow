<script setup>
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  selected: { type: Boolean, default: false },
})

const meta = computed(() => {
  const t = props.data?.step?.type || ''
  if (t === 'dateTime' && props.data?.step?.data?.action === 'businessHours') {
    return 'Business hours'
  }
  if (t === 'trigger') return 'Trigger'
  if (t === 'sendMessage') return 'Send message'
  if (t === 'addComment') return 'Add comment'
  if (t === 'dateTime') return 'Date / time'
  return t
})

const isBusinessHours = computed(
  () =>
    props.data?.step?.type === 'dateTime' && props.data?.step?.data?.action === 'businessHours',
)

const isTrigger = computed(() => props.data?.step?.type === 'trigger')

const isSendMessage = computed(() => props.data?.step?.type === 'sendMessage')

const isAddComment = computed(() => props.data?.step?.type === 'addComment')

/** Which header icon to show (matches workflow-builder style). */
const headerIcon = computed(() => {
  if (isTrigger.value) return 'trigger'
  if (isBusinessHours.value) return 'businessHours'
  if (isSendMessage.value) return 'sendMessage'
  if (isAddComment.value) return 'addComment'
  return null
})
</script>

<template>
  <div
    class="flow-node"
    :class="{
      'flow-node--selected': selected,
      'flow-node--business-hours': isBusinessHours,
      'flow-node--trigger': isTrigger,
    }"
  >
    <Handle
      v-if="!isTrigger"
      id="in"
      class="flow-handle"
      type="target"
      :position="Position.Top"
    />
    <div class="flow-node__header">
      <span v-if="headerIcon" class="flow-node__icon" :class="`flow-node__icon--${headerIcon}`">
        <!-- Trigger: magenta lightning -->
        <svg
          v-if="headerIcon === 'trigger'"
          class="flow-node__svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <!-- Business hours: orange calendar -->
        <svg
          v-else-if="headerIcon === 'businessHours'"
          class="flow-node__svg"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect x="3.5" y="5.5" width="17" height="15" rx="2" stroke="currentColor" stroke-width="1.5" />
          <path d="M3.5 10h17" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M8 3.5v4M16 3.5v4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <circle cx="12" cy="15" r="1.75" fill="currentColor" />
        </svg>
        <!-- Send message: teal paper plane outline -->
        <svg
          v-else-if="headerIcon === 'sendMessage'"
          class="flow-node__svg"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </svg>
        <!-- Add comment: light blue speech bubble with text lines -->
        <svg
          v-else-if="headerIcon === 'addComment'"
          class="flow-node__svg"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 4.5h11.5A2.5 2.5 0 0120 7v6.5a2.5 2.5 0 01-2.5 2.5h-5.2L8 19.5V16H5A2.5 2.5 0 013 13.5V7A2.5 2.5 0 015 4.5z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <path
            d="M7.5 8.5h7M7.5 11.5h9M7.5 14.5h6"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <span class="flow-node__title">{{ data.label }}</span>
    </div>
    <div class="flow-node__body">
      <p v-if="data.description" class="flow-node__desc">{{ data.description }}</p>
      <p v-else class="flow-node__desc flow-node__desc--muted">No description</p>
      <span class="flow-node__badge">{{ meta }}</span>
    </div>

    <Handle
      v-if="isBusinessHours"
      id="success"
      class="flow-handle flow-handle--success"
      type="source"
      :position="Position.Bottom"
    />
    <Handle
      v-if="isBusinessHours"
      id="failure"
      class="flow-handle flow-handle--failure"
      type="source"
      :position="Position.Bottom"
    />
    <Handle
      v-if="!isBusinessHours"
      id="out"
      class="flow-handle flow-handle--out"
      type="source"
      :position="Position.Bottom"
    />
  </div>
</template>

<style scoped>
.flow-node {
  /* Card stays light; override global theme vars so title/description stay dark
     (in prefers-color-scheme: dark, --color-* are light and would wash out on white). */
  --color-heading: #0f172a;
  --color-text: #334155;

  min-width: 200px;
  max-width: 280px;
  padding: 0 0 20px;
  border-radius: 10px;
  border: 1px solid var(--flow-node-border, #c8d0e0);
  background: var(--flow-node-bg, #fff);
  box-shadow: 0 1px 2px rgba(20, 30, 50, 0.06);
  position: relative;
  font-size: 13px;
  line-height: 1.35;
  color: var(--color-text);
  /* Do not use overflow:hidden — Handle components sit slightly outside the box
     (bottom/top -4px) so edges straddle the border; clipping hides half the dot. */
  overflow: visible;
}

.flow-node--selected {
  border-color: #3b6cff;
  box-shadow: 0 0 0 2px rgba(59, 108, 255, 0.2);
}

.flow-node__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 8px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  border-top-left-radius: 9px;
  border-top-right-radius: 9px;
}

.flow-node__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.flow-node__svg {
  width: 20px;
  height: 20px;
  display: block;
}

.flow-node__icon--trigger {
  color: #e60076;
}

.flow-node__icon--businessHours {
  color: #ea580c;
}

.flow-node__icon--sendMessage {
  color: #0d9488;
}

.flow-node__icon--addComment {
  color: #38bdf8;
}

.flow-node__body {
  padding: 8px 12px 0;
}

.flow-node__title {
  font-weight: 600;
  color: var(--color-heading, #2c3e50);
  word-break: break-word;
  min-width: 0;
}

.flow-node__desc {
  color: var(--color-text, #2c3e50);
  opacity: 0.88;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12px;
}

.flow-node__desc--muted {
  opacity: 0.45;
  font-style: italic;
}

.flow-node__badge {
  display: inline-block;
  margin-top: 6px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #4a5568;
  background: #edf2f7;
  border-radius: 4px;
  padding: 2px 6px;
}

.flow-node--business-hours {
  padding-bottom: 16px;
  border-color: #f97316;
  border-width: 1.5px;
}

.flow-node--business-hours .flow-node__header {
  border-bottom-color: #fed7aa;
}

/* Entry node: not opened in details drawer; no pointer "button" feel on the card. */
.flow-node--trigger {
  cursor: default;
}

:deep(.flow-handle) {
  width: 8px;
  height: 8px;
  background: #64748b;
  border: 2px solid #fff;
  z-index: 3;
}

/* Match vue-flow__handle-bottom: center on the bottom edge (half in, half out). */
:deep(.flow-handle--out) {
  left: 50% !important;
  bottom: 0 !important;
  transform: translate(-50%, 50%) !important;
}

:deep(.flow-handle--success) {
  left: calc(50% - 22px) !important;
  bottom: 0 !important;
  transform: translate(-50%, 50%) !important;
  background: #22c55e !important;
  border: 2px solid #fff !important;
}

:deep(.flow-handle--failure) {
  left: calc(50% + 22px) !important;
  bottom: 0 !important;
  transform: translate(-50%, 50%) !important;
  background: #ef4444 !important;
  border: 2px solid #fff !important;
}
</style>
