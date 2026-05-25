<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import { z } from "zod";
import { FetchError } from "ofetch";

const config = useRuntimeConfig();
const isE2eMode = computed(() => config.public.e2eMode);
const hasTurnstileSiteKey = computed(() =>
  Boolean(config.public.turnstileSiteKey),
);

// Data Fetching
interface SanityReferenceItem {
  _id: string;
  title: string;
}
const { data: categories } = await useSanityQuery<SanityReferenceItem[]>(
  `*[_type == "category"]{_id, title}`,
);
const { data: tags } = await useSanityQuery<SanityReferenceItem[]>(
  `*[_type == "tag"]{_id, "title": name}`,
);

// Form State
const title = ref("");
const description = ref("");
const categoryId = ref("");
const suggestedCategory = ref("");
const tagIds = ref<string[]>([]);
const suggestedTagsInput = ref("");
const websiteAddress = ref(""); // Honeypot
const turnstileToken = ref("");

// UI State
const isHydrated = ref(false);
const isSubmitting = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

// TipTap Editor
const editor = useEditor({
  content: "",
  extensions: [StarterKit],
  editorProps: {
    attributes: {
      class:
        "tiptap-editor max-w-none focus:outline-none min-h-[200px] p-4 border border-slate-200 dark:border-brand-surface rounded-lg bg-white dark:bg-brand-bg",
    },
  },
  onUpdate: () => {
    saveDraft();
  },
});

// Draft Persistence
const DRAFT_KEY = "pogo-guide-submission-draft";

const saveDraft = () => {
  if (!isHydrated.value) return;
  const draft = {
    title: title.value,
    description: description.value,
    categoryId: categoryId.value,
    suggestedCategory: suggestedCategory.value,
    tagIds: tagIds.value,
    suggestedTagsInput: suggestedTagsInput.value,
    htmlContent: editor.value?.getHTML() || "",
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY);
};

onMounted(() => {
  isHydrated.value = true;
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (savedDraft) {
    try {
      const parsed = JSON.parse(savedDraft);
      title.value = parsed.title || "";
      description.value = parsed.description || "";
      categoryId.value = parsed.categoryId || "";
      suggestedCategory.value = parsed.suggestedCategory || "";
      tagIds.value = parsed.tagIds || [];
      suggestedTagsInput.value = parsed.suggestedTagsInput || "";
      if (parsed.htmlContent && editor.value) {
        editor.value.commands.setContent(parsed.htmlContent);
      }
    } catch (e) {
      console.error("Failed to load draft", e);
    }
  }
});

watch(
  [
    title,
    description,
    categoryId,
    suggestedCategory,
    tagIds,
    suggestedTagsInput,
  ],
  () => {
    saveDraft();
  },
  { deep: true },
);

// Zod Schema
const submitGuideSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title is too long"),
    description: z.string().max(200, "Description is too long").optional(),
    categoryId: z.string().optional(),
    suggestedCategory: z
      .string()
      .max(50, "Suggested category is too long")
      .optional(),
    htmlContent: z
      .string()
      .min(10, "Guide content is too short. Please add more details.")
      .max(50000, "Guide content is too long."),
  })
  .refine(
    (data) =>
      data.categoryId ||
      (data.suggestedCategory && data.suggestedCategory.trim() !== ""),
    {
      message: "Please select a category or suggest a new one.",
      path: ["categoryId"],
    },
  );

// Form Submission
const submitForm = async () => {
  if (!editor.value) return;

  const htmlContent = editor.value.getHTML();

  const formData = {
    title: title.value,
    description: description.value,
    categoryId: categoryId.value,
    suggestedCategory: suggestedCategory.value,
    htmlContent: htmlContent,
  };

  // Client-side Validation using Zod
  const validation = submitGuideSchema.safeParse(formData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    errorMessage.value = firstError?.message || "Validation failed";
    return;
  }

  if (!turnstileToken.value && !isE2eMode.value && hasTurnstileSiteKey.value) {
    errorMessage.value = "Please complete the security check.";
    return;
  }

  const suggestedTags = suggestedTagsInput.value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  isSubmitting.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const data = await $fetch("/api/submit-guide", {
      method: "POST",
      body: {
        title: title.value,
        description: description.value,
        categoryId: categoryId.value,
        suggestedCategory: suggestedCategory.value,
        tagIds: tagIds.value,
        suggestedTags: suggestedTags,
        htmlContent: htmlContent,
        websiteAddress: websiteAddress.value,
        turnstileToken: turnstileToken.value,
      },
    });

    if (data.success) {
      successMessage.value =
        "Thank you! Your guide has been submitted for review.";
      // Reset form
      title.value = "";
      description.value = "";
      categoryId.value = "";
      suggestedCategory.value = "";
      tagIds.value = [];
      suggestedTagsInput.value = "";
      editor.value.commands.setContent("");
      clearDraft();
    }
  } catch (err: unknown) {
    if (err instanceof FetchError) {
      errorMessage.value = err.data?.statusMessage || "Failed to submit guide.";
    } else {
      errorMessage.value = "An unexpected error occurred.";
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <main class="max-w-4xl mx-auto px-6 py-12">
    <h1 class="text-3xl font-black text-slate-900 dark:text-brand-text mb-4">
      Submit a Guide
    </h1>
    <p class="text-slate-600 dark:text-slate-300 mb-8">
      Share your knowledge with the community! Use the form below to draft a new
      guide. Your submission will be saved as a draft and reviewed by moderators
      before publishing.
    </p>

    <div
      v-if="successMessage"
      class="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-6 rounded-xl mb-8"
    >
      <h3 class="text-xl font-bold mb-2">Success!</h3>
      <p>{{ successMessage }}</p>
      <NuxtLink
        to="/guides"
        class="inline-block mt-4 text-green-700 dark:text-green-400 font-semibold hover:underline"
      >
        &larr; Back to Guides
      </NuxtLink>
    </div>

    <form
      v-else
      class="space-y-6 bg-slate-50 dark:bg-brand-bg/5 border border-white/10 p-8 rounded-xl"
      @submit.prevent="submitForm"
    >
      <!-- Honeypot -->
      <div class="hidden" aria-hidden="true">
        <label for="websiteAddress">Leave this blank</label>
        <input
          id="websiteAddress"
          v-model="websiteAddress"
          type="text"
          tabindex="-1"
          autocomplete="off"
        />
      </div>

      <!-- Title -->
      <div>
        <label
          for="title"
          class="block text-sm font-semibold text-slate-900 dark:text-brand-text mb-1"
          >Title <span class="text-red-500">*</span></label
        >
        <input
          id="title"
          v-model="title"
          type="text"
          required
          class="w-full bg-white dark:bg-brand-surface border border-slate-200 dark:border-brand-lightBorder rounded-lg p-3 text-slate-900 dark:text-brand-text focus:ring-2 focus:ring-mystic-blue outline-none"
          placeholder="e.g. How to defeat Giovanni"
        />
      </div>

      <!-- Description -->
      <div>
        <label
          for="description"
          class="block text-sm font-semibold text-slate-900 dark:text-brand-text mb-1"
          >Short Description</label
        >
        <textarea
          id="description"
          v-model="description"
          rows="2"
          class="w-full bg-white dark:bg-brand-surface border border-slate-200 dark:border-brand-lightBorder rounded-lg p-3 text-slate-900 dark:text-brand-text focus:ring-2 focus:ring-mystic-blue outline-none"
          placeholder="A brief summary of this guide"
        ></textarea>
      </div>

      <!-- Category -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            for="categoryId"
            class="block text-sm font-semibold text-slate-900 dark:text-brand-text mb-1"
            >Category <span class="text-red-500">*</span></label
          >
          <select
            id="categoryId"
            v-model="categoryId"
            class="w-full bg-white dark:bg-brand-surface border border-slate-200 dark:border-brand-lightBorder rounded-lg p-3 text-slate-900 dark:text-brand-text focus:ring-2 focus:ring-mystic-blue outline-none"
          >
            <option value="">-- Select a Category --</option>
            <option v-for="cat in categories" :key="cat._id" :value="cat._id">
              {{ cat.title }}
            </option>
          </select>
        </div>
        <div>
          <label
            for="suggestedCategory"
            class="block text-sm font-semibold text-slate-900 dark:text-brand-text mb-1"
            >Or Suggest New Category</label
          >
          <input
            id="suggestedCategory"
            v-model="suggestedCategory"
            type="text"
            class="w-full bg-white dark:bg-brand-surface border border-slate-200 dark:border-brand-lightBorder rounded-lg p-3 text-slate-900 dark:text-brand-text focus:ring-2 focus:ring-mystic-blue outline-none"
            placeholder="If category not found"
          />
        </div>
      </div>

      <!-- Tags -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            for="tagIds"
            class="block text-sm font-semibold text-slate-900 dark:text-brand-text mb-1"
            >Select Tags</label
          >
          <select
            id="tagIds"
            v-model="tagIds"
            multiple
            class="w-full bg-white dark:bg-brand-surface border border-slate-200 dark:border-brand-lightBorder rounded-lg p-3 text-slate-900 dark:text-brand-text focus:ring-2 focus:ring-mystic-blue outline-none min-h-[100px]"
          >
            <option v-for="tag in tags" :key="tag._id" :value="tag._id">
              {{ tag.title }}
            </option>
          </select>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Hold Ctrl/Cmd to select multiple
          </p>
        </div>
        <div>
          <label
            for="suggestedTagsInput"
            class="block text-sm font-semibold text-slate-900 dark:text-brand-text mb-1"
            >Suggest New Tags</label
          >
          <input
            id="suggestedTagsInput"
            v-model="suggestedTagsInput"
            type="text"
            class="w-full bg-white dark:bg-brand-surface border border-slate-200 dark:border-brand-lightBorder rounded-lg p-3 text-slate-900 dark:text-brand-text focus:ring-2 focus:ring-mystic-blue outline-none"
            placeholder="e.g. rocket, events, tips (comma separated)"
          />
        </div>
      </div>

      <!-- TipTap Editor -->
      <div>
        <label
          class="block text-sm font-semibold text-slate-900 dark:text-brand-text mb-2"
          >Guide Content <span class="text-red-500">*</span></label
        >

        <!-- Editor Toolbar -->
        <div
          v-if="editor"
          class="flex flex-wrap gap-2 mb-2 p-2 bg-slate-100 dark:bg-brand-surface border border-slate-200 dark:border-brand-lightBorder rounded-lg"
        >
          <button
            type="button"
            :class="{
              'bg-slate-300 dark:bg-slate-700': editor.isActive('bold'),
            }"
            class="px-2 py-1 rounded text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            @click="editor.chain().focus().toggleBold().run()"
          >
            B
          </button>
          <button
            type="button"
            :class="{
              'bg-slate-300 dark:bg-slate-700': editor.isActive('italic'),
            }"
            class="px-2 py-1 rounded text-sm italic text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            @click="editor.chain().focus().toggleItalic().run()"
          >
            I
          </button>
          <button
            type="button"
            :class="{
              'bg-slate-300 dark:bg-slate-700': editor.isActive('bulletList'),
            }"
            class="px-2 py-1 rounded text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            @click="editor.chain().focus().toggleBulletList().run()"
          >
            • List
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            :class="{
              'bg-slate-300 dark:bg-slate-700': editor.isActive('orderedList'),
            }"
            @click="editor.chain().focus().toggleOrderedList().run()"
          >
            1. List
          </button>
        </div>

        <editor-content :editor="editor" />
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="text-red-500 text-sm font-semibold">
        {{ errorMessage }}
      </div>

      <!-- Turnstile -->
      <div v-if="hasTurnstileSiteKey && !isE2eMode" class="mt-4">
        <NuxtTurnstile v-model="turnstileToken" />
      </div>

      <!-- Submit Button -->
      <div
        class="flex justify-end pt-4 border-t border-slate-200 dark:border-brand-surface"
      >
        <button
          type="submit"
          :disabled="
            !isHydrated ||
            isSubmitting ||
            (!turnstileToken && !isE2eMode && hasTurnstileSiteKey)
          "
          class="px-6 py-3 bg-mystic-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md transition-all"
        >
          {{ isSubmitting ? "Submitting..." : "Submit Guide" }}
        </button>
      </div>
    </form>
  </main>
</template>

<style>
/* Basic styles to override Tailwind's CSS resets inside the editor */
.tiptap-editor {
  color: inherit;
}
.tiptap-editor p {
  margin-bottom: 0.75em;
}
.tiptap-editor ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75em;
}
.tiptap-editor ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.75em;
}
.tiptap-editor li {
  margin-bottom: 0.25em;
}
.tiptap-editor strong {
  font-weight: 700;
}
.tiptap-editor em {
  font-style: italic;
}
.tiptap-editor a {
  text-decoration: underline;
  color: #3b82f6; /* Tailwind blue-500 */
}
/* Placeholder support if added later */
.tiptap-editor p.is-editor-empty:first-child::before {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
