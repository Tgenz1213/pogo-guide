<template>
  <Teleport to="body">
    <div
      v-if="suggestion"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestion-detail-title"
      @click.self="emit('close')"
    >
      <div class="modal-panel flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="modal-header shrink-0">
          <div>
            <h2 id="suggestion-detail-title" class="modal-title">
              Suggestion Details
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Submitted on
              {{ new Date(suggestion.submittedAt).toLocaleString() }}
            </p>
          </div>
          <button class="modal-close" aria-label="Close" @click="emit('close')">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div
          class="modal-body overflow-y-auto flex-1 p-6 space-y-8 bg-slate-900 text-slate-200"
        >
          <!-- Suggestion Info Section -->
          <section
            class="bg-slate-800 rounded-lg shadow-xs border border-slate-700 p-5"
          >
            <h3 class="text-lg font-semibold text-white mb-4">
              Suggestion Information
            </h3>
            <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt class="font-medium text-slate-400">Guide Path</dt>
                <dd class="mt-1 text-slate-200 font-mono">
                  {{ suggestion.guidePath }}
                </dd>
              </div>
              <div>
                <dt class="font-medium text-slate-400">Status</dt>
                <dd class="mt-1">
                  <span
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="statusClass(suggestion.status || 'pending')"
                  >
                    {{ suggestion.status || "pending" }}
                  </span>
                </dd>
              </div>
              <div class="md:col-span-2">
                <dt class="font-medium text-slate-400">
                  Suggested Content Edit
                </dt>
                <dd
                  class="mt-1 text-slate-300 bg-slate-900 p-3 rounded-md border border-slate-800 whitespace-pre-wrap break-words"
                >
                  {{ suggestion.content || "No content provided." }}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <!-- Footer Actions -->
        <div class="modal-footer shrink-0">
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-800 transition-colors"
              @click="emit('close')"
            >
              Close
            </button>
            <button
              v-if="suggestion.status !== 'dismissed'"
              class="px-4 py-2 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-800 transition-colors"
              @click="handleAction('dismissed')"
            >
              Dismiss Suggestion
            </button>
            <button
              v-if="suggestion.status !== 'reviewed'"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
              @click="handleAction('reviewed')"
            >
              Mark Reviewed
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
export interface SuggestionRow {
  _id: string;
  guidePath: string;
  content: string;
  status: "pending" | "reviewed" | "dismissed";
  submittedAt: number | string;
}

const props = defineProps<{
  suggestion: SuggestionRow | null;
}>();

const emit = defineEmits<{
  close: [];
  action: [action: "reviewed" | "dismissed", suggestionId: string];
}>();

function handleAction(action: "reviewed" | "dismissed") {
  if (!props.suggestion) return;
  emit("action", action, props.suggestion._id);
}

function statusClass(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    reviewed: "bg-green-100 text-green-800",
    dismissed: "bg-slate-100 text-slate-600",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fade-in 0.2s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-panel {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 56rem;
  overflow: hidden;
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slide-up {
  from {
    transform: translateY(20px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f8fafc;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: transparent;
  border-radius: 0.5rem;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: -0.5rem;
  margin-right: -0.5rem;
}

.modal-close:hover {
  background: #334155;
  color: #f8fafc;
}

.modal-close svg {
  width: 1.5rem;
  height: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  background: #1e293b;
  border-top: 1px solid #334155;
}
</style>
