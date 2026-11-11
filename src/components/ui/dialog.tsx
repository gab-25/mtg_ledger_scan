import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

/**
 * A modal on Radix Dialog: centred box on desktop, a sheet rising from the bottom on a phone (under 840px).
 * The title is required (it names the dialog); `description` is optional.
 */
function DialogContent({
  title,
  description,
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title: React.ReactNode; description?: React.ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed z-50 flex max-h-[92dvh] flex-col gap-5 overflow-y-auto border border-line bg-card p-5 text-foreground shadow-[0_24px_64px_rgba(0,0,0,.5)] focus:outline-none",
          "inset-x-0 bottom-0 rounded-t-2xl pb-[calc(20px+env(safe-area-inset-bottom))] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
          "min-[840px]:inset-x-auto min-[840px]:top-1/2 min-[840px]:bottom-auto min-[840px]:left-1/2 min-[840px]:w-[min(560px,calc(100vw-48px))] min-[840px]:-translate-x-1/2 min-[840px]:-translate-y-1/2 min-[840px]:rounded-xl min-[840px]:p-7 min-[840px]:data-[state=open]:slide-in-from-bottom-0 min-[840px]:data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="m-0 font-serif text-[26px] font-semibold">{title}</DialogPrimitive.Title>
            {description && <DialogPrimitive.Description className="mt-1 mb-0 text-[13px] text-muted-foreground">{description}</DialogPrimitive.Description>}
          </div>
          <DialogPrimitive.Close
            aria-label="Close"
            className="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-text-2 hover:bg-surface-2 hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Dialog, DialogClose, DialogContent, DialogTrigger };
