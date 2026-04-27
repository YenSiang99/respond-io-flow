<script setup>
import { ref } from 'vue'

const props = defineProps({
  /** When true, omit page-level heading and hint (e.g. inside a dialog). */
  embedded: { type: Boolean, default: false },
  submitLabel: { type: String, default: 'Create node' },
})

const emit = defineEmits(['create'])

const title = ref('')
const description = ref('')
const nodeType = ref('sendMessage')

const typeOptions = [
  { value: 'sendMessage', label: 'Send message' },
  { value: 'addComment', label: 'Add comment' },
  { value: 'businessHours', label: 'Business hours' },
]

function submit() {
  emit('create', {
    title: title.value.trim() || 'Untitled',
    description: description.value,
    nodeType: nodeType.value,
  })
}
</script>

<template>
  <form class="create-form" :class="{ 'create-form--embedded': embedded }" @submit.prevent="submit">
    <h2 v-if="!embedded" class="create-form__heading">Create node</h2>
    <p v-if="!embedded" class="create-form__hint">
      Add a node to the flow. It will appear on the canvas and can be dragged.
    </p>
    <label class="field">
      <span class="field__label field__label--soft">Title</span>
      <input
        v-model="title"
        class="field__input field__input--muted"
        type="text"
        name="title"
        placeholder="Title"
        autocomplete="off"
      />
    </label>
    <label class="field">
      <span class="field__label field__label--soft">Description</span>
      <textarea
        v-model="description"
        class="field__input field__input--area field__input--muted"
        name="description"
        rows="3"
        placeholder="Description"
      />
    </label>
    <label class="field">
      <span class="field__label">Type of node</span>
      <select v-model="nodeType" class="field__input" name="nodeType">
        <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </label>
    <button type="submit" class="btn-primary">{{ submitLabel }}</button>
  </form>
</template>

<style scoped>
.create-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.create-form--embedded {
  gap: 14px;
}

.create-form__heading {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-heading, #2c3e50);
}

.create-form__hint {
  font-size: 12px;
  color: var(--color-text, #2c3e50);
  opacity: 0.7;
  margin: -4px 0 4px;
  line-height: 1.4;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field__label {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
}

.field__label--soft {
  color: #9ca3af;
  font-weight: 500;
}

.field__input {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  padding: 8px 10px;
  font: inherit;
  /* Avoid light --color-text on white fields in dark mode (same as node drawer) */
  color: #0f172a;
  -webkit-text-fill-color: #0f172a;
  caret-color: #0f172a;
  background: #fff;
}

/* Title + description: real values stay readable; empty state + placeholder stay clearly grey */
.field__input--muted {
  caret-color: #94a3b8;
}

.field__input--muted:placeholder-shown:not(:focus) {
  color: #94a3b8;
  -webkit-text-fill-color: #94a3b8;
}

.field__input--muted::placeholder,
.field__input--muted::-webkit-input-placeholder {
  color: #94a3b8;
  -webkit-text-fill-color: #94a3b8;
  opacity: 1;
}

.field__input--muted::-moz-placeholder {
  color: #94a3b8;
  opacity: 1;
}

.field__input--muted:not(:placeholder-shown) {
  color: #0f172a;
  -webkit-text-fill-color: #0f172a;
}

.field__input--muted:focus {
  color: #0f172a;
  -webkit-text-fill-color: #0f172a;
  caret-color: #3b6cff;
}

.field__input--muted:focus::placeholder,
.field__input--muted:focus::-webkit-input-placeholder {
  color: #94a3b8;
  -webkit-text-fill-color: #94a3b8;
}

.field__input:focus {
  outline: none;
  border-color: #3b6cff;
  box-shadow: 0 0 0 2px rgba(59, 108, 255, 0.15);
}

.field__input--area {
  resize: vertical;
  min-height: 64px;
}

.btn-primary {
  margin-top: 4px;
  border: none;
  border-radius: 8px;
  padding: 10px 14px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  background: #3b6cff;
  color: #fff;
}

.btn-primary:hover {
  background: #2d56cc;
}
</style>
