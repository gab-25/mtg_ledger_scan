import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getCollection, type CollectionRow } from "../api/collection";
import { badgeVariant } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import FoilTag from "../components/FoilTag";
import SearchBox from "../components/SearchBox";
import { EMPTY, META } from "@/lib/styles";
import { cn } from "@/lib/utils";

/** The "List cards" button of the For sale page and its dialog: find a card of the collection, then list it. */
export default function QuickList() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [, setPicked] = useState<CollectionRow | null>(null);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setSearch("");
      setQ("");
      setPicked(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <Button type="button" onClick={() => setOpen(true)}>List cards</Button>
      <DialogContent title="List cards">
        {open && (
          <>
            <SearchBox id="quick_q" label="Search your collection" value={search} placeholder="Search by name or set…"
              autoFocus onChange={setSearch} onSearch={setQ}
              onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); }} />
            <Results q={q} onPick={setPicked} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Results({ q, onPick }: { q: string; onPick: (row: CollectionRow) => void }) {
  const query = useQuery({
    queryKey: ["collection", "quick", q], queryFn: () => getCollection(new URLSearchParams({ q })),
    enabled: q !== "", placeholderData: keepPreviousData,
  });
  if (!q) return <p className={cn(EMPTY, "py-6")}>Type at least 3 letters to find a card.</p>;
  if (!query.data) return null;
  const rows = query.data.results;
  if (rows.length === 0) return <p className={cn(EMPTY, "py-6")}>No cards match.</p>;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => (
        <li key={r.id} className="border-b border-line last:border-b-0">
          <button type="button" onClick={() => onPick(r)}
            className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-1 py-2 text-left text-foreground hover:bg-accent">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-medium">{r.name}</span>
                {r.foil && <FoilTag />}
              </span>
              <span className={META}>
                {r.set_code} · {!r.is_product && <>{r.condition} · </>}{r.language} · ×{r.quantity}
              </span>
            </span>
            <Badge variant={badgeVariant(r.badge.tone)}>{r.badge.label}</Badge>
          </button>
        </li>
      ))}
    </ul>
  );
}
