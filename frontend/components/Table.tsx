"use client";

import type { Key, ReactNode } from "react";

export interface TableColumn<T> {
  header: string;
  align?: "left" | "right";
  accessKey?: keyof T;
  render?: (row: T) => ReactNode;
}

interface Props<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey?: (row: T, index: number) => Key;
  emptyMessage?: string;
  className?: string;
}

function renderCell<T>(
  col: TableColumn<T>,
  row: T,
): ReactNode {
  if (col.render) return col.render(row);
  if (col.accessKey) {
    const v = row[col.accessKey];
    return v === null || v === undefined ? "" : String(v);
  }
  return "";
}

export default function Table<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No data",
  className,
}: Props<T>) {
  return (
    <div className={`w-full overflow-x-auto ${className ?? ""}`}>
      <table className="w-full text-sm">
        <thead className="bg-bg-subtle">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                scope="col"
                className={`px-3 py-2 font-label text-text-muted ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child>td]:border-b-0">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => {
              const key = getRowKey
                ? getRowKey(row, rowIndex)
                : rowIndex;
              return (
                <tr
                  key={key}
                  className="border-b border-border"
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-3 py-2 min-h-[40px] ${
                        col.align === "right"
                          ? "text-right tabular-nums-col font-mono"
                          : "text-left"
                      }`}
                    >
                      {renderCell(col, row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
