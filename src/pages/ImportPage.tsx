import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { fieldErrors, useAction } from "../actions";
import { EXPORT_URL, getImportColumns, importCsv } from "../api/collection";
import Field from "../components/Field";
import { PageHead } from "../components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUTTON_GROUP, CODE, FORM_ACTIONS, FORM_GRID, HINT, PANEL } from "@/lib/styles";
import { cn } from "@/lib/utils";
import PageState from "../components/PageState";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

/** ledger/import.html */
export default function ImportPage() {
  useDocumentTitle("Import CSV");
  const columns = useQuery({ queryKey: ["import-columns"], queryFn: getImportColumns });
  const [file, setFile] = useState<File | null>(null);
  const upload = useAction(() => importCsv(file), { navigateTo: "/" });
  if (!columns.data) return <PageState error={columns.error} />;
  const cols = columns.data.columns;

  function submit(e: FormEvent) {
    e.preventDefault();
    upload.mutate();
  }

  return (
    <>
      <PageHead eyebrow={<Link to="/" className="text-inherit no-underline">Collection</Link>} title="Import CSV" />

      <form method="post" encType="multipart/form-data" className={PANEL} onSubmit={submit}>
        <p className={cn(HINT, "m-0")}>
          Columns:{" "}
          {cols.map((c, i) => (
            <span key={c}>
              <code className={CODE}>{c}</code>
              {i < cols.length - 1 && ", "}
            </span>
          ))}
          . Only <code className={CODE}>name</code> and <code className={CODE}>set</code> are required. Rows matching an existing card, condition, language
          and foil update its quantity; the others are added. The same format is produced by{" "}
          <a href={EXPORT_URL}>Export CSV</a>.
        </p>
        <div className={FORM_GRID}>
          <Field label="CSV file" id="id_file" errors={fieldErrors(upload.error, "file")} wide>
            <Input type="file" name="file" id="id_file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
        <div className={FORM_ACTIONS}>
          <div className={BUTTON_GROUP}>
            <Button type="submit" variant="primary" disabled={upload.isPending}>Import</Button>
            <Button asChild variant="ghost"><Link to="/">Cancel</Link></Button>
          </div>
        </div>
      </form>
    </>
  );
}
