import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowData } from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Right-aligned header (numbers). */
    align?: "right";
    /** Class of the body cells, e.g. "num", "mono dim". */
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
    <div className="table-wrap">
      <table className={className} style={style}>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} scope="col"
                  style={header.column.columnDef.meta?.align === "right" ? { textAlign: "right" } : undefined}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={cell.column.columnDef.meta?.className}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={table.getAllLeafColumns().length} className="empty">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
