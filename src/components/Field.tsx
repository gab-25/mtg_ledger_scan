import type { ReactNode } from "react";

type Props = {
  label: string;
  id: string;
  help?: ReactNode;
  errors?: string[];
  wide?: boolean;
  check?: boolean;
  children: ReactNode;
};

/** theme/includes/field.html: label, input, help text and errors. */
export default function Field({ label, id, help, errors, wide, check, children }: Props) {
  const className = ["field", check && "check", wide && "wide"].filter(Boolean).join(" ");
  return (
    <div className={className}>
      {check ? (
        <>
          {children}
          <label htmlFor={id}>{label}</label>
        </>
      ) : (
        <>
          <label htmlFor={id}>{label}</label>
          {children}
        </>
      )}
      {help && <div className="help">{help}</div>}
      <Errors errors={errors} />
    </div>
  );
}

export function Errors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <ul className="errors">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}
