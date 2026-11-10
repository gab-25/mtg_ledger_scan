import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-11 w-full min-w-0 rounded-md border border-line-2 bg-background px-3 py-0 font-sans text-sm text-foreground outline-none placeholder:text-placeholder focus:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "[&[readonly]]:bg-surface-2 [&[readonly]]:text-muted-foreground",
        "file:mr-3 file:border-0 file:bg-transparent file:font-sans file:text-sm file:font-medium file:text-foreground [&[type=file]]:py-2.5",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
