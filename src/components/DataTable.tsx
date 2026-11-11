import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowData } from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Right-aligned header (numbers). */
    align?: "right";
    /** Tailwind classes of the body cells, e.g. "text-right font-mono". */
    className?: string;
  }
}

type Props<T> = {
  columns: ColumnDef<T, any>[];
  data: T[];
  empty: ReactNode;
  className?: string;
  style?: CSSProperties;
  getRowId?: (row: T) => string;
  /** false inside a TablePanel, which draws the frame. */
  framed?: boolean;
};

/**
 * The tables of the app, on TanStack Table. Filtering and pagination happen on the server (manual mode); sorting
 * is not enabled yet.
 */
export default function DataTable<T>({ columns, data, empty, className, style, getRowId, framed = true }: Props<T>) {
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    enableSorting: false,
  });
  return (
    <Table className={className} style={style} framed={framed}>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id} scope="col" className={cn(header.column.columnDef.meta?.align === "right" && "text-right")}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={table.getAllLeafColumns().length} className="px-5 py-10 text-center text-muted-foreground">
              {empty}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

/** The line under a table: "Showing n of N" on the left, the pager on the right. */
export function TableFoot({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground">{children}</div>;
}

/**
 * One box holding a table and what goes with it: the search and filters on top, the table (or, on a phone, its
 * list), "Showing n of N" and the pager below. On a phone the box drops its frame and the list runs full width.
 */
export function TablePanel({ label, toolbar, footer, children }: { label: string; toolbar?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="flex flex-col gap-3 min-[840px]:gap-0 min-[840px]:overflow-hidden min-[840px]:rounded-xl min-[840px]:border min-[840px]:border-line min-[840px]:bg-card print:border-0"
    >
      {toolbar && (
        <div className="flex flex-col gap-3 min-[840px]:flex-row min-[840px]:flex-wrap min-[840px]:items-center min-[840px]:border-b min-[840px]:border-line min-[840px]:px-4 min-[840px]:py-3 print:hidden">
          {toolbar}
        </div>
      )}
      {children}
      {footer && <div className="min-[840px]:border-t min-[840px]:border-line min-[840px]:px-4 min-[840px]:py-3">{footer}</div>}
    </section>
  );
}
