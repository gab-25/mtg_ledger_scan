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
        <img src={image} alt={name} width={350} height={489} className="mx-auto block h-auto w-full max-w-[350px] rounded-[14px]" />
      </DialogContent>
    </Dialog>
  );
}
