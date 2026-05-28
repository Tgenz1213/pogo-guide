<template>
  <Teleport to="body">
    <div
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      @click.self="emit('cancelled')"
    >
      <div class="modal-panel">
        <!-- Header -->
        <div class="modal-header">
          <h2 id="report-modal-title" class="modal-title">Report this Guide</h2>
          <button
            class="modal-close"
            aria-label="Close"
            @click="emit('cancelled')"
          >
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
        <div class="modal-body">
          <p class="modal-description">
            Help us keep content accurate and high-quality. Your report is
            anonymous to other users.
          </p>

          <!-- Success state -->
          <div v-if="submitted" class="success-state">
            <svg
              class="success-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p class="success-text">
              Thank you — your report has been submitted.
            </p>
          </div>

          <!-- Form -->
          <form v-else @submit.prevent="handleSubmit">
            <!-- Reason select -->
            <div class="field">
              <label for="report-reason" class="field-label">Reason *</label>
              <select
                id="report-reason"
                v-model="reason"
                class="field-select"
                required
              >
                <option value="" disabled>Select a reason…</option>
                <option value="inaccurate">
                  Inaccurate / outdated information
                </option>
                <option value="spam">Spam or low-quality content</option>
                <option value="copyright">Copyright violation</option>
                <option value="inappropriate">
                  Inappropriate or harmful content
                </option>
                <option value="other">Other</option>
              </select>
            </div>

            <!-- Details textarea -->
            <div class="field">
              <label for="report-details" class="field-label">
                Additional details
                <span class="field-optional">(optional, max 500 chars)</span>
              </label>
              <textarea
                id="report-details"
                v-model="details"
                class="field-textarea"
                rows="3"
                maxlength="500"
                placeholder="Describe the issue in more detail…"
              />
              <p class="field-counter">{{ details.length }} / 500</p>
            </div>

            <!-- Already-reported error -->
            <p v-if="alreadyReported" class="error-msg">
              You've already reported this guide.
            </p>
            <p v-else-if="submitError" class="error-msg">{{ submitError }}</p>

            <!-- Footer actions -->
            <div class="modal-actions">
              <button
                type="button"
                class="btn-cancel"
                @click="emit('cancelled')"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn-submit"
                :disabled="!reason || loading"
              >
                <span v-if="loading">Submitting…</span>
                <span v-else>Submit Report</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  sanityDocId: string;
}>();

const emit = defineEmits<{
  submitted: [];
  cancelled: [];
}>();

const reason = ref("");
const details = ref("");
const loading = ref(false);
const submitted = ref(false);
const alreadyReported = ref(false);
const submitError = ref<string | null>(null);

async function handleSubmit() {
  if (!reason.value) return;

  loading.value = true;
  alreadyReported.value = false;
  submitError.value = null;

  try {
    await $fetch("/api/guide-reports", {
      method: "POST",
      body: {
        sanityDocId: props.sanityDocId,
        reason: reason.value,
        details: details.value.trim() || undefined,
      },
    });

    submitted.value = true;
    // Give the user a moment to read the success state, then close + notify parent
    setTimeout(() => emit("submitted"), 1500);
  } catch (err) {
    const fetchErr = err as { data?: { message?: string }; status?: number };
    if (fetchErr.status === 409) {
      alreadyReported.value = true;
    } else {
      submitError.value =
        fetchErr.data?.message ?? "Something went wrong. Please try again.";
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* ── Backdrop ─────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fade-in 0.15s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* ── Panel ────────────────────────────────────────── */
.modal-panel {
  background: #fff;
  border-radius: 0.75rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 28rem;
  animation: slide-up 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slide-up {
  from {
    transform: translateY(12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

:global(.dark) .modal-panel {
  background: #1e293b;
  color: #f1f5f9;
}

/* ── Header ───────────────────────────────────────── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

:global(.dark) .modal-header {
  border-bottom-color: #334155;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
}

:global(.dark) .modal-title {
  color: #f1f5f9;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  border-radius: 0.375rem;
  color: #94a3b8;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #475569;
}

:global(.dark) .modal-close:hover {
  background: #334155;
  color: #e2e8f0;
}

.modal-close svg {
  width: 1.25rem;
  height: 1.25rem;
}

/* ── Body ─────────────────────────────────────────── */
.modal-body {
  padding: 1.25rem 1.5rem 1.5rem;
}

.modal-description {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

:global(.dark) .modal-description {
  color: #94a3b8;
}

/* ── Fields ───────────────────────────────────────── */
.field {
  margin-bottom: 1rem;
}

.field-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.375rem;
}

:global(.dark) .field-label {
  color: #cbd5e1;
}

.field-optional {
  font-weight: 400;
  color: #94a3b8;
  font-size: 0.75rem;
}

.field-select,
.field-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #fff;
  color: #0f172a;
  font-size: 0.875rem;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  font-family: inherit;
}

.field-select:focus,
.field-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

:global(.dark) .field-select,
:global(.dark) .field-textarea {
  background: #0f172a;
  border-color: #334155;
  color: #f1f5f9;
}

.field-textarea {
  resize: vertical;
  min-height: 5rem;
}

.field-counter {
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: right;
  margin-top: 0.25rem;
}

/* ── Actions ──────────────────────────────────────── */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: transparent;
  color: #475569;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.btn-cancel:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

:global(.dark) .btn-cancel {
  color: #94a3b8;
  border-color: #334155;
}

:global(.dark) .btn-cancel:hover {
  background: #1e293b;
}

.btn-submit {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 0.5rem;
  background: #2563eb;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    opacity 0.15s;
}

.btn-submit:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Error ────────────────────────────────────────── */
.error-msg {
  font-size: 0.875rem;
  color: #dc2626;
  margin-top: 0.5rem;
}

/* ── Success ──────────────────────────────────────── */
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 0;
  text-align: center;
}

.success-icon {
  width: 3rem;
  height: 3rem;
  color: #22c55e;
}

.success-text {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #166534;
}

:global(.dark) .success-text {
  color: #86efac;
}
</style>
