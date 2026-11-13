import type { ReactElement } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

/**
 * The card's image enlarged on hover or focus of `children` (the trigger: a link, or a focusable element).
 * Without an image it renders `children` alone.
 */
export default function CardPreview({ image, name, children }: { image: string; name: string; children: ReactElement }) {
  if (!image) return children;
  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="right">
        <img src={image} alt={name} width={250} height={349} className="block h-auto w-[250px] rounded-[10px]" />
      </HoverCardContent>
    </HoverCard>
  );
}
