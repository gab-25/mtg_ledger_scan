import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 font-sans text-xs font-medium whitespace-nowrap min-h-[26px] print:border print:border-[#999] print:bg-transparent print:text-black",
  {
    variants: {
      variant: {
        neutral: "bg-line text-text-2",
        gold: "bg-gold-bg text-gold-hi",
        pending: "bg-warn-bg text-warn",
        live: "bg-ok-bg text-ok",
        ok: "bg-ok-bg text-ok",
        danger: "bg-danger-bg text-danger-hi",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
const BADGE_VARIANTS: readonly BadgeVariant[] = ["neutral", "gold", "pending", "live", "ok", "danger"];

function Badge({
  className,
  variant = "neutral",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & { variant?: BadgeVariant; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, BADGE_VARIANTS, badgeVariants, type BadgeVariant };
