import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  id: string;
  help?: ReactNode;
  errors?: string[];
  wide?: boolean;
  check?: boolean;
  children: ReactNode;
};

/** theme/includes/field.html: label, control, help text and errors; with `check` the label follows the control. */
export default function Field({ label, id, help, errors, wide, check, children }: Props) {
  return (
    <div data-slot="field" className={cn("flex flex-col gap-1.5", wide && "col-span-full", check && "min-h-11 flex-row items-center gap-2.5 self-end")}>
      {check ? (
        <>
          {children}
          <Label htmlFor={id}>{label}</Label>
        </>
      ) : (
        <>
          <Label htmlFor={id}>{label}</Label>
          {children}
        </>
      )}
      {help && <div className="text-xs text-muted-foreground [&_ul]:mt-0.5 [&_ul]:mb-0 [&_ul]:list-disc [&_ul]:pl-[18px]">{help}</div>}
      <Errors errors={errors} />
    </div>
  );
}

export function Errors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <ul className="m-0 list-none p-0 text-[13px] text-danger">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

type ChoiceSelectProps = {
  id?: string;
  name?: string;
  value: string;
  options: [value: string, label: string][];
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
};

/** A shadcn Select over a list of [value, label] choices (the server's choice lists). */
export function ChoiceSelect({ id, name, value, options, onChange, className, "aria-label": ariaLabel }: ChoiceSelectProps) {
  return (
    <Select name={name} value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>{l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
