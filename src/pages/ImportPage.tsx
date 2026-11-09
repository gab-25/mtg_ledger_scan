import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { fieldErrors, useAction } from "../actions";
import { EXPORT_URL, getImportColumns, importCsv } from "../api/collection";
import Field from "../components/Field";
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
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>Collection</Link>
          </div>
          <h1>Import CSV</h1>
        </div>
      </header>

      <form method="post" encType="multipart/form-data" className="panel" onSubmit={submit}>
        <p className="hint" style={{ margin: 0 }}>
          Columns:{" "}
          {cols.map((c, i) => (
            <span key={c}>
              <code>{c}</code>
              {i < cols.length - 1 && ", "}
            </span>
          ))}
          . Only <code>name</code> and <code>set</code> are required. Rows matching an existing card, condition, language
          and foil update its quantity and price; the others are added. The same format is produced by{" "}
          <a href={EXPORT_URL}>Export CSV</a>.
        </p>
        <div className="form-grid">
          <Field label="CSV file" id="id_file" errors={fieldErrors(upload.error, "file")} wide>
            <input type="file" name="file" id="id_file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
        <div className="form-actions">
          <div className="group">
            <button type="submit" className="btn btn-primary" disabled={upload.isPending}>Import</button>
            <Link className="btn btn-ghost" to="/">Cancel</Link>
          </div>
        </div>
      </form>
    </>
  );
}
