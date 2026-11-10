import type { FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "./icons";

type Props = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
};

/** The search field of the page heads: icon and input in one bordered box, submitted with Enter. */
export default function SearchBox({ id, label, value, placeholder, autoFocus, onChange, onSubmit }: Props) {
  return (
    <form
      method="get"
      role="search"
      className="m-0 flex min-h-11 min-w-[260px] items-center gap-2 rounded-md border border-line-2 bg-card px-3.5 focus-within:border-primary"
      onSubmit={onSubmit}
    >
      <SearchIcon />
      <label htmlFor={id} className="sr-only">{label}</label>
      <Input
        id={id}
        type="search"
        name="q"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-h-0 flex-1 border-0 bg-transparent px-0 focus:border-0"
        onChange={(e) => onChange(e.target.value)}
      />
    </form>
  );
}
