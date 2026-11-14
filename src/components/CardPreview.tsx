import type { ReactElement } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useMediaQuery } from "../hooks/useMediaQuery";

/** A touch screen: no hover, so the preview opens on tap. */
export const TOUCH_QUERY = "(hover: none)";

/**
 * The card's image enlarged when `children` (the trigger: a button, a link, or a focusable element) is hovered or
 * focused; on a touch screen, which has no hover, a tap opens it in a dialog instead.
 * Without an image it renders `children` alone.
 */
export default function CardPreview({ image, name, children }: { image: string; name: string; children: ReactElement }) {
  const touch = useMediaQuery(TOUCH_QUERY);
  if (!image) return children;
  if (touch) {
    return (
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent title={name} className="min-[840px]:w-auto">
          <img src={image} alt={name} width={350} height={489} className="mx-auto block h-auto w-full max-w-[350px] rounded-[14px]" />
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="right">
        <img src={image} alt={name} width={250} height={349} className="block h-auto w-[250px] rounded-[10px]" />
      </HoverCardContent>
    </HoverCard>
  );
}
