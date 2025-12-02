<template>
  <div
    class="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-200"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-screen overflow-y-auto animate-fade-in">
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 class="text-xl font-medium text-slate-900 dark:text-white">
          {{ $t('message.tag_manager_title') }}
        </h3>
        <button
          type="button"
          class="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          @click="$emit('close')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="px-6 py-5 space-y-5">
        <p class="text-sm text-slate-600 dark:text-slate-300">
          {{ $t('message.tag_manager_description') }}
        </p>

        <form @submit.prevent="handleCreateTag" class="flex flex-col sm:flex-row gap-2">
          <input
            v-model="newTagName"
            type="text"
            class="form-input flex-1"
            :placeholder="$t('message.new_tag_placeholder')"
          />
          <button
            type="submit"
            class="btn-primary sm:w-auto"
            :disabled="creatingTag"
          >
            <span v-if="creatingTag" class="spinner mr-2"></span>
            {{ $t('message.add_tag') }}
          </button>
        </form>
        <p v-if="formError" class="form-error">{{ formError }}</p>

        <div v-if="tagStore.loading" class="text-sm text-slate-500 dark:text-slate-400">
          {{ $t('message.tag_loading') }}
        </div>

        <div v-else>
          <div v-if="tagStore.tags.length">
            <ul class="divide-y divide-slate-200 dark:divide-slate-700">
              <li
                v-for="tag in tagStore.tags"
                :key="tag.id"
                class="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div class="flex-1 min-w-0">
                  <div v-if="editingTagId === tag.id" class="flex flex-col sm:flex-row gap-2">
                    <input
                      v-model="editingTagName"
                      type="text"
                      class="form-input flex-1"
                    />
                    <div class="flex gap-2">
                      <button
                        type="button"
                        class="btn-primary sm:w-auto"
                        @click="saveTagEdit(tag)"
                        :disabled="savingTag"
                      >
                        <span v-if="savingTag" class="spinner mr-2"></span>
                        {{ $t('message.save_changes') }}
                      </button>
                      <button
                        type="button"
                        class="btn-outline sm:w-auto"
                        @click="cancelEdit"
                      >
                        {{ $t('message.cancel') }}
                      </button>
                    </div>
                  </div>
                  <div v-else class="space-y-1">
                    <p class="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {{ tag.name }}
                    </p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                      {{ $t('message.tag_session_count', { count: tag.sessionCount ?? 0 }) }}
                    </p>
                  </div>
                </div>

                <div v-if="editingTagId !== tag.id" class="flex items-center gap-2">
                  <button
                    type="button"
                    class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                    @click="startEdit(tag)"
                  >
                    {{ $t('message.tag_rename') }}
                  </button>
                  <button
                    type="button"
                    class="text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors"
                    @click="confirmDelete(tag)"
                  >
                    {{ $t('message.tag_delete') }}
                  </button>
                </div>
              </li>
            </ul>
          </div>
          <p v-else class="text-sm text-slate-500 dark:text-slate-400">
            {{ $t('message.no_tags_yet') }}
          </p>
        </div>
      </div>

      <div
        v-if="tagToDelete"
        class="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800/60 space-y-3"
      >
        <p class="text-sm text-red-700 dark:text-red-300">
          {{ $t('message.tag_delete_confirm', { tagName: tagToDelete.name }) }}
        </p>
        <p v-if="deleteError" class="form-error">{{ deleteError }}</p>
        <div class="flex flex-col sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            class="btn-outline"
            @click="cancelDelete"
            :disabled="deleteInProgress"
          >
            {{ $t('message.cancel') }}
          </button>
          <button
            type="button"
            class="btn-danger"
            @click="performDelete"
            :disabled="deleteInProgress"
          >
            <span v-if="deleteInProgress" class="spinner mr-2"></span>
            {{ $t('message.tag_delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTagStore } from '@/stores/tagStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['close', 'tag-deleted'])

const tagStore = useTagStore()
const sessionStore = useSessionStore()
const { t } = useI18n()

const newTagName = ref('')
const formError = ref('')
const creatingTag = ref(false)
const editingTagId = ref(null)
const editingTagName = ref('')
const savingTag = ref(false)
const tagToDelete = ref(null)
const deleteInProgress = ref(false)
const deleteError = ref('')

const resetEditState = () => {
  editingTagId.value = null
  editingTagName.value = ''
  savingTag.value = false
}

const handleCreateTag = async () => {
  formError.value = ''
  const name = newTagName.value.trim()

  if (!name) {
    formError.value = t('message.tag_name_required')
    return
  }

  creatingTag.value = true

  try {
    const result = await tagStore.createTag(name)
    if (result.success) {
      newTagName.value = ''
    } else {
      formError.value = result.error || t('message.tag_create_failed')
    }
  } catch (error) {
    formError.value = error.message || t('message.tag_create_failed')
  } finally {
    creatingTag.value = false
  }
}

const startEdit = (tag) => {
  formError.value = ''
  editingTagId.value = tag.id
  editingTagName.value = tag.name
}

const cancelEdit = () => {
  resetEditState()
}

const saveTagEdit = async (tag) => {
  formError.value = ''
  const name = editingTagName.value.trim()

  if (!name) {
    formError.value = t('message.tag_name_required')
    return
  }

  savingTag.value = true

  try {
    const result = await tagStore.updateTag(tag.id, name)
    if (result.success) {
      sessionStore.renameTagInSessions(tag.id, name)
      resetEditState()
    } else {
      formError.value = result.error || t('message.tag_update_failed')
    }
  } catch (error) {
    formError.value = error.message || t('message.tag_update_failed')
  } finally {
    savingTag.value = false
  }
}

const confirmDelete = (tag) => {
  deleteError.value = ''
  tagToDelete.value = tag
}

const cancelDelete = () => {
  tagToDelete.value = null
  deleteError.value = ''
}

const performDelete = async () => {
  if (!tagToDelete.value) return

  deleteError.value = ''
  deleteInProgress.value = true

  try {
    const result = await tagStore.deleteTag(tagToDelete.value.id)
    if (result.success) {
      sessionStore.removeTagFromSessions(tagToDelete.value.id)
      emit('tag-deleted', tagToDelete.value.id)
      cancelDelete()
    } else {
      deleteError.value = result.error || t('message.tag_delete_failed')
    }
  } catch (error) {
    deleteError.value = error.message || t('message.tag_delete_failed')
  } finally {
    deleteInProgress.value = false
  }
}

onMounted(() => {
  if (!tagStore.tags.length) {
    tagStore.fetchTags()
  }
})
</script>
