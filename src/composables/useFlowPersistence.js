import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useFlowStore } from '@/stores/flow'
import {
  loadFlowStateAsyncFromLocalStorageOrFetchedSeed,
  saveFlowStateToLocalStorage,
  FLOW_STEPS_QUERY_KEY,
} from '@/api/flowPersistence'

function debounce(fn, ms) {
  let t = 0
  return () => {
    clearTimeout(t)
    t = setTimeout(fn, ms)
  }
}

/**
 * Loads flow JSON into the Query cache and persists Pinia edits via `useMutation`.
 */
export function useFlowPersistence() {
  const store = useFlowStore()
  const queryClient = useQueryClient()
  const { steps, positions } = storeToRefs(store)

  useQuery({
    queryKey: FLOW_STEPS_QUERY_KEY,
    queryFn: loadFlowStateAsyncFromLocalStorageOrFetchedSeed,
  })

  const { mutate } = useMutation({
    mutationFn: saveFlowStateToLocalStorage,
    onSuccess: (saved) => {
      queryClient.setQueryData(FLOW_STEPS_QUERY_KEY, saved)
    },
  })

  const schedulePersist = debounce(() => {
    mutate({
      steps: JSON.parse(JSON.stringify(steps.value)),
      positions: { ...positions.value },
    })
  }, 400)

  watch([steps, positions], schedulePersist, { deep: true })
}
