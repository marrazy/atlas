import { ChevronDownIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { FieldSummary } from '@/lib/api/types'
import type { ApiState } from '@/lib/api/use-api'
import { foldForSearch, matchField } from '@/lib/field'

type FieldPickerProps = {
  fields: ApiState<FieldSummary[]>
  currentId: number
  /** Shown on the button before the list of fields has loaded. */
  currentName?: string
  onSelect: (fieldId: number) => void
}

export function FieldPicker({ fields, currentId, currentName, onSelect }: FieldPickerProps) {
  const [open, setOpen] = useState(false)

  const sorted = useMemo(
    () => (fields.status === 'ready' ? [...fields.data].sort((a, b) => a.name.localeCompare(b.name, 'nb')) : []),
    [fields],
  )
  const name = currentName ?? sorted.find((field) => field.field_id === currentId)?.name

  const emptyText =
    fields.status === 'loading' ? 'Loading fields…' : fields.status === 'error' ? fields.message : 'No field matches.'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 min-w-[200px] justify-between gap-2.5 px-3 text-sm"
        >
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Field</span> {name ?? '…'}
          </span>
          <ChevronDownIcon aria-hidden="true" strokeWidth={1.5} className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[260px] p-0">
        <Command filter={matchField} label="Search fields">
          <CommandInput placeholder="Search fields" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {sorted.map((field) => (
              <CommandItem
                key={field.field_id}
                value={String(field.field_id)}
                keywords={[foldForSearch(field.name)]}
                data-checked={field.field_id === currentId}
                onSelect={() => {
                  setOpen(false)
                  onSelect(field.field_id)
                }}
              >
                {field.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
