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
/** A two-column definition list of facts (dt grey, dd below). */
export const FACTS = "m-0 grid grid-cols-2 gap-3.5 [&_dd]:mx-0 [&_dd]:mt-1 [&_dd]:mb-0 [&_dd]:text-sm [&_dt]:text-xs [&_dt]:text-muted-foreground";
/** A page section: heading line and its content. */
export const SECTION = "flex flex-col gap-3.5";
/** The heading line of a section: h2 on the left, a hint or action on the right. */
export const SECTION_HEAD = "flex flex-wrap items-baseline justify-between gap-3";
/** A section title. */
export const H2 = "m-0 font-serif text-[26px] font-semibold";
/** Boxes side by side, wrapping under 300px. */
export const DETAIL_GRID = "grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-5";
/** An amber note box. */
export const NOTE = "rounded-md bg-warn-bg px-3 py-2.5 text-[13px] text-warn";
/** The page column of the scan screens (no sidebar). */
export const APP_MAIN = "mx-auto flex w-full max-w-[1100px] min-w-0 flex-col gap-6 px-[clamp(16px,3vw,48px)] py-8";
/** An amber warning block on the scan screens. */
export const SCAN_WARN = "m-0 block rounded-lg bg-warn-bg p-3.5 text-sm text-warn no-underline";
/** The form column of the scan screens. */
export const SCAN_PANEL = "flex max-w-[560px] flex-col gap-5";
/** A bordered box grouping fields on the scan screens. */
export const SCAN_BOX = "m-0 flex flex-col gap-2.5 rounded-[12px] border border-line bg-card p-4";
/** Small uppercase grey heading (page eyebrow, fieldset legend). */
export const EYEBROW = "text-[13px] tracking-[1.5px] text-muted-foreground uppercase";
/** A card thumbnail (40×56) in scan lists; also the empty placeholder. */
export const THUMB = "h-14 w-10 flex-none rounded-sm border border-line-2 bg-surface-2 object-cover";
/** One row of the review list: thumb, text, actions. */
export const SCAN_LINE = "flex items-center gap-3 border-b border-line py-2.5";
/** The text column of SCAN_LINE. */
export const SCAN_LINE_TEXT = "flex min-w-0 flex-1 flex-col gap-[3px]";
/** "Nothing here" text: centered, grey, padded. */
export const EMPTY = "m-0 px-5 py-10 text-center text-muted-foreground";
