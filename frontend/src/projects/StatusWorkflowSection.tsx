import { useEffect, useMemo, useState } from 'react'
import {
  STATUS_FLOW_ITEM_TYPES,
  STATUS_OPTIONS_BY_ITEM_TYPE,
  getStatusFlowItemTypeLabel,
  type StatusFlowItemType,
  type StatusFlowRequest,
  type StatusFlowResponse,
} from './statusFlowTypes'
import { useCreateStatusFlow, useDeleteStatusFlow, useStatusFlows, useUpdateStatusFlow } from './useStatusFlows'

interface StatusWorkflowSectionProps {
  projectId: number
  canManage: boolean
}

interface StatusFlowDraft {
  itemType: StatusFlowItemType
  fromStatus: string
  toStatuses: string[]
  disabled: boolean
}

const DEFAULT_ITEM_TYPE: StatusFlowItemType = 'task'

const DEFAULT_DRAFT: StatusFlowDraft = {
  itemType: DEFAULT_ITEM_TYPE,
  fromStatus: '',
  toStatuses: [],
  disabled: false,
}

const PAGE_SIZE = 6

function createDraft(flow?: StatusFlowResponse): StatusFlowDraft {
  if (!flow) {
    return DEFAULT_DRAFT
  }

  return {
    itemType: flow.itemType,
    fromStatus: flow.fromStatus ?? '',
    toStatuses: [...flow.toStatuses],
    disabled: flow.disabled,
  }
}

function sortFlows(flows: StatusFlowResponse[]) {
  return [...flows].sort((left, right) => {
    const itemTypeCompare = getStatusFlowItemTypeLabel(left.itemType).localeCompare(getStatusFlowItemTypeLabel(right.itemType))
    if (itemTypeCompare !== 0) {
      return itemTypeCompare
    }

    return (left.fromStatus ?? '').localeCompare(right.fromStatus ?? '')
  })
}

export default function StatusWorkflowSection({ projectId, canManage }: StatusWorkflowSectionProps) {
  const { statusFlows, isLoading } = useStatusFlows(projectId)
  const { createStatusFlow, isPending: isCreating } = useCreateStatusFlow()
  const { updateStatusFlow, isPending: isUpdating } = useUpdateStatusFlow()
  const { deleteStatusFlow, isPending: isDeleting } = useDeleteStatusFlow()

  const [draft, setDraft] = useState<StatusFlowDraft>(DEFAULT_DRAFT)
  const [editingFlowId, setEditingFlowId] = useState<number | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | StatusFlowItemType>('all')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isPending = isCreating || isUpdating || isDeleting
  const availableStatuses = useMemo(() => STATUS_OPTIONS_BY_ITEM_TYPE[draft.itemType], [draft.itemType])
  const filteredFlows = useMemo(() => {
    const normalizedFilter = statusFilter.trim().toLowerCase()

    return sortFlows(statusFlows).filter((flow) => {
      const matchesItemType = itemTypeFilter === 'all' || flow.itemType === itemTypeFilter
      if (!matchesItemType) {
        return false
      }

      if (!normalizedFilter) {
        return true
      }

      const searchableValues = [
        getStatusFlowItemTypeLabel(flow.itemType),
        flow.fromStatus ?? 'new item',
        ...flow.toStatuses,
      ]

      return searchableValues.some((value) => value.toLowerCase().includes(normalizedFilter))
    })
  }, [itemTypeFilter, statusFilter, statusFlows])
  const totalPages = Math.max(1, Math.ceil(filteredFlows.length / PAGE_SIZE))
  const pagedFlows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredFlows.slice(start, start + PAGE_SIZE)
  }, [filteredFlows, page])

  useEffect(() => {
    setDraft((currentDraft) => {
      const validStatuses = STATUS_OPTIONS_BY_ITEM_TYPE[currentDraft.itemType]
      const nextFromStatus = currentDraft.fromStatus && validStatuses.includes(currentDraft.fromStatus)
        ? currentDraft.fromStatus
        : ''
      const nextToStatuses = currentDraft.toStatuses.filter((status) => validStatuses.includes(status))

      if (nextFromStatus === currentDraft.fromStatus && nextToStatuses.length === currentDraft.toStatuses.length) {
        return currentDraft
      }

      return {
        ...currentDraft,
        fromStatus: nextFromStatus,
        toStatuses: nextToStatuses,
      }
    })
  }, [draft.itemType])

  useEffect(() => {
    setPage(1)
  }, [itemTypeFilter, statusFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const resetForm = (itemType?: StatusFlowItemType) => {
    setDraft({
      ...DEFAULT_DRAFT,
      itemType: itemType ?? DEFAULT_DRAFT.itemType,
    })
    setEditingFlowId(null)
  }

  const openNewRuleForm = () => {
    setErrorMessage('')
    setSuccessMessage('')
    setEditingFlowId(null)
    setDraft((currentDraft) => ({
      ...DEFAULT_DRAFT,
      itemType: currentDraft.itemType,
    }))
    setIsFormVisible(true)
  }

  const closeForm = () => {
    setEditingFlowId(null)
    setIsFormVisible(false)
  }

  const handleToggleStatus = (status: string) => {
    setDraft((currentDraft) => {
      const exists = currentDraft.toStatuses.includes(status)
      return {
        ...currentDraft,
        toStatuses: exists
          ? currentDraft.toStatuses.filter((value) => value !== status)
          : [...currentDraft.toStatuses, status],
      }
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (draft.toStatuses.length === 0) {
      setErrorMessage('Select at least one allowed target status.')
      return
    }

    const payload: StatusFlowRequest = {
      itemType: draft.itemType,
      fromStatus: draft.fromStatus.trim() ? draft.fromStatus : null,
      toStatuses: draft.toStatuses,
      disabled: draft.disabled,
    }

    try {
      if (editingFlowId) {
        await updateStatusFlow({ projectId, flowId: editingFlowId, data: payload })
        setSuccessMessage('Status workflow updated.')
        resetForm(payload.itemType)
      } else {
        await createStatusFlow({ projectId, data: payload })
        setSuccessMessage('Status workflow created.')
        resetForm(payload.itemType)
      }
      setIsFormVisible(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save status workflow.')
    }
  }

  const handleEdit = (flow: StatusFlowResponse) => {
    setErrorMessage('')
    setSuccessMessage('')
    setEditingFlowId(flow.id)
    setDraft(createDraft(flow))
    setIsFormVisible(true)
  }

  const handleDelete = async (flow: StatusFlowResponse) => {
    if (!confirm(`Delete the ${getStatusFlowItemTypeLabel(flow.itemType)} workflow from ${flow.fromStatus ?? 'new item'}?`)) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deleteStatusFlow({ projectId, flowId: flow.id })
      if (editingFlowId === flow.id) {
        resetForm()
        setIsFormVisible(false)
      }
      setSuccessMessage('Status workflow removed.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete status workflow.')
    }
  }

  return (
    <div className="bg-white rounded border border-gray-200 p-4 mt-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Status Workflow</h2>
          <p className="text-sm text-gray-600 mt-1">
            Define allowed status transitions by item type. If no rule exists for an item type and current status, any transition remains allowed.
          </p>
        </div>
        {!canManage && (
          <span className="px-2 py-1 text-xs font-medium rounded border border-amber-200 bg-amber-50 text-amber-700">
            Managers only
          </span>
        )}
      </div>

      {successMessage && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded text-sm">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {errorMessage}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[32rem]">
            <label className="block text-xs font-medium text-gray-700">
              Filter by item type
              <select
                value={itemTypeFilter}
                onChange={(event) => setItemTypeFilter(event.target.value as 'all' | StatusFlowItemType)}
                className="mt-1.5 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                <option value="all">All item types</option>
                {STATUS_FLOW_ITEM_TYPES.map((itemType) => (
                  <option key={itemType.value} value={itemType.value}>{itemType.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-gray-700">
              Filter by status
              <input
                type="text"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                placeholder="Search from or to statuses"
                className="mt-1.5 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </label>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            {canManage && !isFormVisible && (
              <button
                type="button"
                onClick={openNewRuleForm}
                disabled={isPending}
                className="inline-flex items-center rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
              >
                New Rule
              </button>
            )}
          </div>
        </div>

        {isFormVisible && (
          <div className="border border-gray-200 rounded-lg p-4 bg-stone-50/70 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {editingFlowId ? 'Edit Workflow Rule' : 'Add Workflow Rule'}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="text-xs font-medium text-gray-600 hover:text-gray-900"
                disabled={isPending}
              >
                Close form
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-gray-700">
                  Item type
                  <select
                    value={draft.itemType}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, itemType: event.target.value as StatusFlowItemType }))}
                    disabled={!canManage || isPending}
                    className="mt-1.5 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:bg-gray-100"
                  >
                    {STATUS_FLOW_ITEM_TYPES.map((itemType) => (
                      <option key={itemType.value} value={itemType.value}>{itemType.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-medium text-gray-700">
                  From status
                  <select
                    value={draft.fromStatus}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, fromStatus: event.target.value }))}
                    disabled={!canManage || isPending}
                    className="mt-1.5 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:bg-gray-100"
                  >
                    <option value="">New item</option>
                    {availableStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-medium text-gray-700">Allowed target statuses</span>
                  <span className="text-xs text-gray-500">{draft.toStatuses.length} selected</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {availableStatuses.map((status) => {
                    const checked = draft.toStatuses.includes(status)
                    return (
                      <label
                        key={status}
                        className={`flex items-center gap-2 rounded border px-3 py-2 text-sm transition ${checked ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white text-gray-700'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canManage || isPending}
                          onChange={() => handleToggleStatus(status)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{status}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.disabled}
                  disabled={!canManage || isPending}
                  onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, disabled: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Disable this rule without deleting it
              </label>

              {canManage ? (
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {editingFlowId ? 'Save rule' : 'Add rule'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={isPending}
                    className="inline-flex items-center rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  You can view workflow rules here, but only project managers can change them.
                </p>
              )}
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading workflow rules...</div>
        ) : filteredFlows.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
            No workflow rules match the current filters.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {pagedFlows.map((flow) => (
                <div key={flow.id} className={`rounded-lg border px-3 py-3 ${flow.disabled ? 'border-gray-200 bg-gray-50' : 'border-indigo-100 bg-indigo-50/40'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{getStatusFlowItemTypeLabel(flow.itemType)}</span>
                        {flow.disabled && (
                          <span className="rounded border border-gray-300 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-600">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        From {flow.fromStatus ?? 'new item'}
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(flow)}
                          className="text-xs font-medium text-indigo-700 hover:text-indigo-900"
                          disabled={isPending}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(flow)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                          disabled={isPending}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {flow.toStatuses.map((status) => (
                      <span
                        key={`${flow.id}-${status}`}
                        className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700"
                      >
                        {status}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={page === 1}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                  disabled={page === totalPages}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}