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
};

/**
 * The tables of the app, on TanStack Table. Filtering and pagination happen on the server (manual mode); sorting
 * is not enabled yet.
 */
export default function DataTable<T>({ columns, data, empty, className, style, getRowId }: Props<T>) {
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
    <Table className={className} style={style}>
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
