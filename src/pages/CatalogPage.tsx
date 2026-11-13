import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCategories, searchCatalog, type CatalogFilters, type Printing } from "../api/catalog";
import DataTable, { TableFoot, TablePanel } from "../components/DataTable";
import { ClearLink, FilterSelect, Filters } from "../components/Filters";
import { PageHead } from "../components/Header";
import SearchBox, { SEARCH_DEBOUNCE_MS } from "../components/SearchBox";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DIM, EMPTY, HINT, META, NUM, PRICE_LABEL, SUB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import PageState from "../components/PageState";
import Pager from "../components/Pager";
import { dateLong, euro, intcomma } from "../format";
import AddFromCatalog from "./AddFromCatalog";
import CardPreview from "../components/CardPreview";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { useIsMobile } from "../hooks/useMediaQuery";

/** A text field shaped as a filter pill. */
const PILL_INPUT = "min-h-9 w-auto rounded-full bg-transparent px-3 text-[13px] text-text-2";

type PriceKey = keyof NonNullable<Printing["prices"]>;

const price = (key: PriceKey, header: string): ColumnDef<Printing> => ({
  id: key,
  header,
  meta: { align: "right", className: NUM },
  cell: ({ row: { original: p } }) => {
    const value = p.prices?.[key];
    return value !== null && value !== undefined ? euro(value, 2) : "—";
  },
});

/** After an add the next search starts at once: focus on the search box, its text selected. */
function focusSearch() {
  const input = document.getElementById("q") as HTMLInputElement | null;
  input?.focus();
  input?.select();
}

const columns: ColumnDef<Printing>[] = [
  {
    id: "product",
    header: "Product",
    cell: ({ row: { original: p } }) => (
      <CardPreview image={p.image_url} name={p.name}>
        <div className="flex w-fit items-center gap-3" tabIndex={p.image_url ? 0 : undefined}>
          {p.image_url && (
            <img src={p.image_url} alt="" loading="lazy" width={36} height={50} className="h-[50px] w-9 rounded-[3px] object-cover" />
          )}
          <div>
            {p.name}
            {p.version && <div className={SUB}>{p.version}</div>}
          </div>
        </div>
      </CardPreview>
    ),
  },
  {
    id: "set",
    header: "Set",
    meta: { className: cn("font-mono", DIM) },
    cell: ({ row: { original: p } }) => (
      <span title={p.expansion_name}>
        {p.expansion_code.toUpperCase()}
        {p.collector_number && ` #${p.collector_number}`}
      </span>
    ),
  },
  {
    id: "owned", header: "Owned", meta: { align: "right", className: NUM },
    cell: ({ row: { original: p } }) => p.owned_qty ?? "—",
  },
  price("trend", "Trend"),
  price("low", "Low"),
  price("avg", "Avg"),
  price("trend_foil", "Foil trend"),
  price("low_foil", "Foil low"),
  price("avg_foil", "Foil avg"),
  {
    id: "add", header: "", meta: { align: "right" },
    cell: ({ row: { original: p } }) => <AddFromCatalog printing={p} onAdded={focusSearch} />,
  },
];

/** The form state: the filters, with the category as the select's string value ("" for none). */
type Form = Omit<CatalogFilters, "category"> & { category: string };

/** The query string of a search, in the order of the API: q, set, number, category, owned. */
function queryOf(f: Form) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.set) params.set("set", f.set);
  if (f.number) params.set("number", f.number);
  if (f.category) params.set("category", f.category);
  if (f.owned) params.set("owned", "1");
  return params;
}

/** The catalog: every CardTrader product (formerly ledger/cards.html). */
export default function CatalogPage() {
  useDocumentTitle("Catalog");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // The previous results stay on screen while the next load, so the search box keeps focus while typing.
  const query = useQuery({
    queryKey: ["catalog", params.toString()], queryFn: () => searchCatalog(params), placeholderData: keepPreviousData,
  });
  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const fromUrl: Form = {
    q: params.get("q") ?? "", set: params.get("set") ?? "", number: params.get("number") ?? "",
    category: params.get("category") ?? "", owned: params.get("owned") === "1",
  };
  const [form, setForm] = useState(fromUrl);
  const mobile = useIsMobile();
  /** Set and number search as you type, like the search box: the first change is a new history entry. */
  const searchFilter = useDebouncedCallback((key: "set" | "number", f: Form) => {
    if (f[key].trim() !== fromUrl[key]) go(f, { replace: fromUrl[key] !== "" });
  }, SEARCH_DEBOUNCE_MS);
  /** Any search drops a pending one of the set and number fields, so it cannot undo it. */
  const go = (f: Form, options?: { replace?: boolean }) => {
    searchFilter.cancel();
    const q = queryOf({ ...f, q: f.q.trim(), set: f.set.trim(), number: f.number.trim() }).toString();
    navigate(q ? `?${q}` : "?", options);
  };
  // Reset on navigation, keeping what is being typed (e.g. a trailing space) when it is the search just run.
  useEffect(() => setForm((f) => {
    const keep = (key: "q" | "set" | "number") => (f[key].trim() === fromUrl[key] ? f[key] : fromUrl[key]);
    return { ...fromUrl, q: keep("q"), set: keep("set"), number: keep("number") };
  }), [params]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!query.data) return <PageState error={query.error} />;
  const data = query.data;
  /** The rows shown: the search results, or before searching the latest releases (if the backend sends them). */
  const listed = data.searched || data.results ? data : null;

  /** Search as you type: the first search is a new history entry, refinements replace it. */
  const autoSearch = (q: string) => {
    if (q !== fromUrl.q) go({ ...form, q }, { replace: fromUrl.q !== "" });
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(form);
  };
  const typeFilter = (key: "set" | "number", value: string) => {
    const next = { ...form, [key]: value };
    setForm(next);
    searchFilter(key, next);
  };
  /** Enter searches at once (with two text fields and no submit button the form does not submit by itself). */
  const enter = (e: KeyboardEvent) => {
    if (e.key === "Enter") submit(e);
  };

  return (
    <>
      <PageHead eyebrow="CardTrader catalog" title="Catalog" />

      <TablePanel
        label="Products"
        toolbar={
          <>
            <SearchBox id="q" label="Search the catalog" value={form.q} placeholder="Search by name or set code…" autoFocus
              className="min-[840px]:min-h-10 min-[840px]:flex-[1_1_260px] min-[840px]:bg-background"
              onChange={(q) => setForm({ ...form, q })} onSubmit={submit} onSearch={autoSearch} />
            <Filters onSubmit={submit} scroll>
              <label htmlFor="f-set" className="sr-only">Set code</label>
              <Input id="f-set" name="set" value={form.set} placeholder="Set (e.g. m21)" className={PILL_INPUT}
                size={10} onChange={(e) => typeFilter("set", e.target.value)} onKeyDown={enter} />
              <label htmlFor="f-number" className="sr-only">Collector number</label>
              <Input id="f-number" name="number" value={form.number} placeholder="Number" className={PILL_INPUT}
                size={6} onChange={(e) => typeFilter("number", e.target.value)} onKeyDown={enter} />
              <FilterSelect id="f-category" label="Category" placeholder="Category" allLabel="All categories"
                value={form.category} options={(categories.data ?? []).map((c) => [String(c.id), c.name])}
                onChange={(v) => go({ ...form, category: v ?? "" })} />
              <label className={buttonVariants({ variant: "pill" })} {...(form.owned ? { "aria-current": "true" } : {})}>
                <Checkbox name="owned" value="1" checked={form.owned} onCheckedChange={(c) => go({ ...form, owned: c === true })} />
                In my collection
              </label>
              {data.searched && <ClearLink to="/catalog/">Clear</ClearLink>}
            </Filters>
          </>
        }
        footer={
          listed && (
            <TableFoot>
              <span>
                Showing {listed.results.length} of {intcomma(listed.count)} products
                {listed.prices_date && ` · Cardmarket price guide of ${dateLong(listed.prices_date)}`}
              </span>
              <Pager page={listed.page} numPages={listed.num_pages}
                href={(page) => {
                  const next = queryOf({ ...data.filters, category: data.filters.category?.toString() ?? "" });
                  next.set("page", String(page));
                  return `?${next}`;
                }} />
            </TableFoot>
          )
        }
      >
        {!data.searched && (
          <p className={cn("m-0 min-[840px]:px-5", listed ? "min-[840px]:border-b min-[840px]:border-line min-[840px]:py-3" : "min-[840px]:py-6", HINT)}>
            {listed && <><strong className="font-medium text-foreground">Latest releases</strong>, newest sets first. </>}
            Search the catalog — every Magic product on CardTrader, cards, sealed products and accessories, with its
            Cardmarket prices (updated nightly) — by name, set code or collector number, or list what you own.
          </p>
        )}
        {listed && (mobile ? (
          <PrintingList rows={listed.results} />
        ) : (
          <DataTable columns={columns} data={listed.results} getRowId={(p) => String(p.ct_id)} framed={false}
            empty="Nothing matches these criteria." />
        ))}
      </TablePanel>
    </>
  );
}

/** The products as a list on a phone, in place of the table: image, name, set and number, owned copies, trend prices. */
function PrintingList({ rows }: { rows: Printing[] }) {
  if (rows.length === 0) return <p className={EMPTY}>Nothing matches these criteria.</p>;
  const trend = (value: string | null | undefined) => (value !== null && value !== undefined ? euro(value, 2) : "—");
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((p) => (
        <li key={p.ct_id} className="flex min-h-16 items-center gap-3 border-b border-line py-2">
          {p.image_url ? (
            <img src={p.image_url} alt="" loading="lazy" width={36} height={50} className="h-[50px] w-9 flex-none rounded-[3px] object-cover" />
          ) : (
            <span aria-hidden="true" className="h-[50px] w-9 flex-none rounded-[3px] border border-line-2 bg-surface-2" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate font-medium">{p.name}</span>
            <span className={cn(META, "mt-0")} title={p.expansion_name}>
              {p.expansion_code.toUpperCase()}
              {p.collector_number && ` #${p.collector_number}`}
              {p.version && ` · ${p.version}`}
            </span>
            {!!p.owned_qty && (
              <Badge variant="gold" className="mt-0.5 min-h-5 px-2 text-[11px]">×{p.owned_qty} owned</Badge>
            )}
          </div>
          <div className="flex flex-none flex-col items-end gap-0.5">
            <span className={PRICE_LABEL}>Trend</span>
            <span className="font-mono text-[15px]">{trend(p.prices?.trend)}</span>
            <span className="font-mono text-xs text-muted-foreground">Foil {trend(p.prices?.trend_foil)}</span>
          </div>
          <div className="flex-none">
            <AddFromCatalog printing={p} onAdded={focusSearch} />
          </div>
        </li>
      ))}
    </ul>
  );
}
