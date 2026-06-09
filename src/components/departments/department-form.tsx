'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Department {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  managerIds?: string[]
}

interface DepartmentFormProps {
  department?: Department | null
  managerOptions: Array<{ value: string; label: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DepartmentForm({
  department,
  managerOptions,
  open,
  onOpenChange,
  onSuccess,
}: DepartmentFormProps) {
  const [name, setName] = useState(department?.name || '')
  const [description, setDescription] = useState(department?.description || '')
  const [isActive, setIsActive] = useState(department?.isActive ?? true)
  const [managerIds, setManagerIds] = useState<string[]>(department?.managerIds || [])
  const [managerSelectorOpen, setManagerSelectorOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEdit = !!department

  useEffect(() => {
    setName(department?.name || '')
    setDescription(department?.description || '')
    setIsActive(department?.isActive ?? true)
    setManagerIds(department?.managerIds || [])
  }, [department])

  const handleManagerToggle = (managerId: string) => {
    setManagerIds((current) =>
      current.includes(managerId)
        ? current.filter((id) => id !== managerId)
        : [...current, managerId],
    )
  }

  const handleManagerRemove = (managerId: string) => {
    setManagerIds((current) => current.filter((id) => id !== managerId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = isEdit ? `/api/departments/${department.id}` : '/api/departments'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isActive,
          managerIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save department')
      }

      toast.success(data.message || `Department ${isEdit ? 'updated' : 'created'} successfully`)
      onSuccess()
      onOpenChange(false)

      // Reset form
      if (!isEdit) {
        setName('')
        setDescription('')
        setIsActive(true)
        setManagerIds([])
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Department' : 'Create Department'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update department information.'
                : 'Add a new department to organize your team.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Engineering, Marketing"
                maxLength={100}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Managers</Label>
              <Popover open={managerSelectorOpen} onOpenChange={setManagerSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={managerSelectorOpen}
                    className="min-h-10 w-full justify-between"
                  >
                    <div className="flex flex-wrap gap-1">
                      {managerIds.length > 0 ? (
                        managerIds.map((managerId) => {
                          const manager = managerOptions.find(
                            (option) => option.value === managerId,
                          )

                          return (
                            <Badge key={managerId} variant="secondary">
                              {manager?.label || 'Unknown manager'}
                              <span
                                role="button"
                                tabIndex={0}
                                className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring"
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  handleManagerRemove(managerId)
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            </Badge>
                          )
                        })
                      ) : (
                        <span className="text-muted-foreground">Select managers...</span>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search managers..." />
                    <CommandList>
                      <CommandEmpty>No managers found.</CommandEmpty>
                      <CommandGroup>
                        {managerOptions.map((manager) => (
                          <CommandItem
                            key={manager.value}
                            value={manager.label}
                            onSelect={() => handleManagerToggle(manager.value)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                managerIds.includes(manager.value) ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            {manager.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-sm text-muted-foreground">
                Only users with the manager role are shown.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive departments are hidden from selection
                </p>
              </div>
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
