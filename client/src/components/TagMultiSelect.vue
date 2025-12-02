<template>
  <div class="relative" ref="wrapper">
    <button
      type="button"
      class="flex items-center justify-between w-full sm:w-auto min-w-[200px] px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      :aria-expanded="isOpen"
      @click="toggleDropdown"
    >
      <span class="truncate text-left mr-2">
        <template v-if="selectedCount === 0">
          {{ placeholder || t('message.filter_by_tags') }}
        </template>
        <template v-else-if="selectedCount === 1">
          {{ selectedTagNames[0] || t('message.filter_by_tags') }}
        </template>
        <template v-else>
          {{ t('message.tags_selected', { count: selectedCount }) }}
        </template>
      </span>
      <svg
        class="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <transition name="fade">
      <div
        v-if="isOpen"
        class="absolute z-20 mt-2 w-64 sm:w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 max-h-80 overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {{ t('message.filter_by_tags') }}
          </p>
          <button
            type="button"
            class="text-xs text-indigo-600 dark:text-indigo-300 hover:text-indigo-500"
            @click="clearSelection"
          >
            {{ t('message.select_all_tags') }}
          </button>
        </div>

        <div v-if="loading" class="py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
          <span class="spinner mr-2"></span>
          {{ t('message.tag_loading') }}
        </div>
        <div v-else-if="!tags.length" class="py-4 text-sm text-slate-500 dark:text-slate-400 text-center">
          {{ t('message.no_tags_available') }}
        </div>
        <ul v-else class="space-y-1">
          <li
            v-for="tag in tags"
            :key="tag.id"
          >
            <label class="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/70 cursor-pointer">
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="form-checkbox"
                  :checked="selectedSet.has(tag.id)"
                  @change="toggleTag(tag.id)"
                />
                <span class="text-sm text-slate-700 dark:text-slate-200">{{ tag.name }}</span>
              </div>
              <span class="text-xs text-slate-400 dark:text-slate-500">{{ tag.sessionCount ?? 0 }}</span>
            </label>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  tags: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const isOpen = ref(false)
const wrapper = ref(null)
const internalSelection = ref([...props.modelValue])

const tagNameById = computed(() => {
  const map = new Map()
  props.tags.forEach(tag => {
    map.set(tag.id, tag.name)
  })
  return map
})

const selectedSet = computed(() => new Set(internalSelection.value))
const selectedCount = computed(() => internalSelection.value.length)
const selectedTagNames = computed(() => internalSelection.value.map(id => tagNameById.value.get(id)).filter(Boolean))

const syncFromProps = (value) => {
  const normalized = Array.isArray(value)
    ? value.map(id => Number(id)).filter(id => !Number.isNaN(id))
    : []
  internalSelection.value = Array.from(new Set(normalized))
}

watch(() => props.modelValue, (newValue) => {
  syncFromProps(newValue)
})

watch(() => props.tags, (newTags) => {
  const validIds = new Set(newTags.map(tag => tag.id))
  const filtered = internalSelection.value.filter(id => validIds.has(id))
  if (filtered.length !== internalSelection.value.length) {
    internalSelection.value = filtered
    emit('update:modelValue', filtered)
  }
})

const toggleDropdown = () => {
  if (props.loading) return
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const toggleTag = (tagId) => {
  const id = Number(tagId)
  if (Number.isNaN(id)) return

  const next = new Set(internalSelection.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }

  const updated = Array.from(next)
  internalSelection.value = updated
  emit('update:modelValue', updated)
}

const clearSelection = () => {
  internalSelection.value = []
  emit('update:modelValue', [])
}

const handleClickOutside = (event) => {
  if (!wrapper.value) return
  if (!wrapper.value.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  syncFromProps(props.modelValue)
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
