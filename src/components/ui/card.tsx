import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

/** The app's boxes: surface background, line border, 14px corners. */
function Card({ className, asChild = false, ...props }: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="card"
      className={cn("flex flex-col gap-4 rounded-xl border border-line bg-card p-6 text-card-foreground print:border-[#999] print:bg-transparent print:text-black", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="card-title" className={cn("m-0 font-serif text-[22px] font-semibold", className)} {...props} />;
}

export { Card, CardTitle };
