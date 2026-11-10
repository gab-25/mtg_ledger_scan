// Tailwind class sets that replace the legacy text helpers (.num, .dim, .sub, .hint).

/** Numbers in table cells: right-aligned, monospaced. */
export const NUM = "text-right font-mono";
/** Secondary text in a cell. */
export const DIM = "text-text-2";
/** A small grey line under a name. */
export const SUB = "text-xs text-muted-foreground";
/** A grey explanatory paragraph. */
export const HINT = "text-[13px] text-muted-foreground";
/** A form's box (max 760px). */
export const PANEL = "flex max-w-[760px] flex-col gap-[22px] rounded-xl border border-line bg-card p-7";
/** The fields of a form, as many columns as fit. */
export const FORM_GRID = "grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[18px]";
/** The buttons under a form: main group on the left, destructive action on the right. */
export const FORM_ACTIONS = "flex max-w-[760px] flex-wrap items-center justify-between gap-3 [&_form]:m-0";
/** A group of buttons inside FORM_ACTIONS. */
export const BUTTON_GROUP = "flex flex-wrap gap-3";
/** Small uppercase grey label before a price. */
export const PRICE_LABEL = "text-[11px] tracking-[1px] text-muted-foreground uppercase";
/** Card details under a name (set · condition · language), monospaced. */
export const META = "mt-0.5 font-mono text-xs text-muted-foreground";
/** Inline code in help text. */
export const CODE = "font-mono text-[13px] text-gold-hi";
