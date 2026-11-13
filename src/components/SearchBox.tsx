import { useRef, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { ClearIcon, SearchIcon } from "./icons";

/** Search as you type: from this many characters (trimmed)… */
export const SEARCH_MIN_CHARS = 3;
/** …once typing pauses for this long (ms). */
export const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoFocus?: boolean;
  className?: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  /**
   * Search as you type: called with the trimmed text after a pause in typing, once it has at least
   * SEARCH_MIN_CHARS characters or when it has been cleared. Enter still searches at once via `onSubmit`.
   */
  onSearch?: (value: string) => void;
};

/**
 * The search field of the page heads: icon, input and clear button (also Escape) in one bordered box, submitted
 * with Enter. No browser autocomplete: its history dropdown would cover the results being searched.
 */
export default function SearchBox({ id, label, value, placeholder, autoFocus, className, onChange, onSubmit, onSearch }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const search = useDebouncedCallback((text: string) => onSearch?.(text), SEARCH_DEBOUNCE_MS);

  function change(next: string) {
    onChange(next);
    search.cancel();
    const text = next.trim();
    if (!onSearch || (text.length > 0 && text.length < SEARCH_MIN_CHARS)) return;
    search(text);
  }

  /** The clear button: empties the box and, when searching as you type, drops the search at once. */
  function clear() {
    search.cancel();
    onChange("");
    onSearch?.("");
    input.current?.focus();
  }

  function submit(e: FormEvent) {
    search.cancel();
    onSubmit(e);
  }

  return (
    <form
      method="get"
      role="search"
      className={cn("m-0 flex min-h-11 min-w-[260px] items-center gap-1.5 rounded-md border border-line-2 bg-card px-3.5 focus-within:border-primary", className)}
      onSubmit={submit}
    >
      <SearchIcon />
      <label htmlFor={id} className="sr-only">{label}</label>
      <Input
        ref={input}
        id={id}
        type="search"
        name="q"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        className="min-h-0 flex-1 border-0 bg-transparent pr-0 pl-0.5 focus:border-0 [&::-webkit-search-cancel-button]:appearance-none"
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            clear();
          }
        }}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          className="-mr-1.5 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={clear}
        >
          <ClearIcon />
        </button>
      )}
    </form>
  );
}
