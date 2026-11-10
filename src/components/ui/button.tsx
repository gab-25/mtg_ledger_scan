import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-line-2 bg-surface px-4 font-sans text-sm font-medium whitespace-nowrap text-foreground no-underline min-h-11 hover:border-line-hover hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "",
        primary: "border-0 px-[18px] bg-primary font-semibold text-primary-foreground hover:bg-gold-hi hover:text-primary-foreground",
        raised: "bg-surface-2",
        ghost: "bg-transparent text-text-2",
        danger: "bg-transparent text-danger border-danger-line hover:border-[#6A3A31] hover:bg-danger-bg hover:text-danger-hi",
        /** The filter pills: highlighted when aria-current="true" or aria-pressed="true". */
        pill: "min-h-9 gap-1.5 rounded-full bg-transparent px-3 text-[13px] font-normal text-text-2 hover:bg-transparent aria-[current=true]:border-primary aria-[current=true]:bg-gold-bg aria-[current=true]:px-3.5 aria-[current=true]:text-foreground aria-pressed:border-primary aria-pressed:bg-gold-bg aria-pressed:px-3.5 aria-pressed:text-foreground",
      },
      size: {
        default: "",
        sm: "min-h-9 px-3 text-[13px] font-normal",
        block: "w-full min-h-10 bg-surface-2 text-[13px] font-normal",
        wide: "w-full min-h-[52px] text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
