import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva("w-full rounded-lg border px-4 py-3 font-sans text-sm", {
  variants: {
    variant: {
      info: "border-[#2A4234] bg-ok-bg text-ok",
      success: "border-[#2A4234] bg-ok-bg text-ok",
      warning: "border-[#4A3A22] bg-warn-bg text-warn",
      error: "border-danger-line bg-danger-bg text-danger",
    },
  },
  defaultVariants: { variant: "info" },
});

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

/** A message box (success, warning, error). role="alert" unless the caller passes another role (or none). */
function Alert({ className, variant = "info", ...props }: React.ComponentProps<"div"> & { variant?: AlertVariant }) {
  return <div data-slot="alert" data-variant={variant} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn("font-medium", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("text-sm", className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle, type AlertVariant };
