import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * A card's thumbnail as a "Show <name>" button: a click or tap opens the image enlarged in a dialog, the same on
 * desktop and phone. `className` sizes the thumbnail (default 36×50).
 */
export default function CardPreview({ image, name, className = "h-[50px] w-9" }: { image: string; name: string; className?: string }) {
  return (
    <Dialog>
      <DialogTrigger
        aria-label={`Show ${name}`}
        className="flex-none cursor-zoom-in rounded-[3px] border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <img src={image} alt="" loading="lazy" className={cn("block rounded-[3px] object-cover", className)} />
      </DialogTrigger>
      <DialogContent title={name} className="min-[840px]:w-auto">
        {/* As large as fits: 460px wide at most, shorter on a low screen (a card is 63×88). */}
        <img
          src={image}
          alt={name}
          width={460}
          height={642}
          className="mx-auto block h-auto w-[min(460px,calc((92dvh-150px)*63/88))] max-w-full rounded-[18px]"
        />
      </DialogContent>
    </Dialog>
  );
}
