"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CircleIcon } from "lucide-react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "aspect-square size-[18px] shrink-0 cursor-pointer rounded-full border border-line-hover bg-background p-0 text-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }

/** A radio shaped as a chip (no dot): grey, gold when checked. */
function RadioChip({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-chip"
      className={cn(
        "inline-flex min-h-11 min-w-12 cursor-pointer items-center justify-center rounded-md border border-line-2 bg-surface-2 px-2.5 font-sans text-[13px] text-text-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:font-semibold data-[state=checked]:text-primary-foreground",
        className
      )}
      {...props}
    />
  )
}

export { RadioChip }

/** A radio shaped as a selectable card: its content is the label, a dot on the left shows the choice. */
function RadioCard({ className, children, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-card"
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-line-2 bg-card p-2.5 text-left font-sans text-foreground data-[state=checked]:border-2 data-[state=checked]:border-primary data-[state=checked]:bg-gold-bg",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="flex size-[18px] flex-none items-center justify-center rounded-full border border-line-hover bg-background group-data-[state=checked]:border-primary"
      >
        <span className="hidden size-2 rounded-full bg-primary group-data-[state=checked]:block" />
      </span>
      {children}
    </RadioGroupPrimitive.Item>
  )
}

export { RadioCard }
