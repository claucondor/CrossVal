"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Input from "../../../../components/Input";
import Button from "../../../../components/Button";
import Badge from "../../../../components/Badge";
import ConfirmDialog from "../../../../components/ConfirmDialog";
import LineItemEditor from "../../../../components/LineItemEditor";
import DocumentTotals from "../../../../components/DocumentTotals";
import { formatCents } from "../../../../lib/money";
import {
  addLineAction,
  deleteDocumentAction,
  deleteLineAction,
  duplicateDocumentAction,
  finalizeDocumentAction,
  patchDocumentAction,
  patchLineAction,
} from "../../../../actions/document.actions";
import type {
  DocumentResponse,
  LineItemInput,
  LineItemResponse,
} from "../../../../lib/types";

// Convierte la respuesta del server a un LineItemInput (que es lo que
// consume `LineItemEditor`). No toca importes: solo descarta los campos
// calculados y conserva el id por separado.
function toLineInput(line: LineItemResponse): LineItemInput {
  return {
    description: line.description,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    discount: line.discount,
    taxPercent: line.taxPercent,
  };
}

type DialogKind = "finalize" | "delete" | "duplicate" | null;

interface Props {
  document: DocumentResponse;
}

export default function DocumentDetailView({ document: initialDoc }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    customer?: string;
    issueDate?: string;
  }>({});
  const [linesError, setLinesError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<
    | "metadata"
    | `line:${string}`
    | "add-line"
    | "finalize"
    | "delete"
    | "duplicate"
    | null
  >(null);

  const isDraft = initialDoc.status === "draft";

  const closeDialog = () => {
    if (isPending) return;
    setDialog(null);
  };

  // ---------- Metadata (save on blur) ----------
  // Los inputs son uncontrolled (defaultValue). En cada blur comparamos
  // contra el valor del server y, si difiere, disparamos patchDocumentAction.
  // Tras el save, `revalidatePath` en la action re-renderiza este árbol con
  // los datos frescos; los `key`s en cada Input fuerzan un remount si el id
  // del documento cambia (no en el flujo normal).
  const saveMetadata = (
    next: Pick<DocumentResponse, "title" | "customer" | "issueDate">,
  ) => {
    if (!isDraft) return;
    setMetadataError(null);
    setFieldErrors({});
    setPendingAction("metadata");
    startTransition(async () => {
      const result = await patchDocumentAction(initialDoc.id, next);
      setPendingAction((current) => (current === "metadata" ? null : current));
      if (result.error) {
        if (result.error.field) {
          setFieldErrors({ [result.error.field]: result.error.message });
        } else {
          setMetadataError(result.error.message);
        }
        return;
      }
      router.refresh();
    });
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === initialDoc.title) return;
    saveMetadata({
      title: value,
      customer: initialDoc.customer,
      issueDate: initialDoc.issueDate,
    });
  };

  const handleCustomerBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === initialDoc.customer) return;
    saveMetadata({
      title: initialDoc.title,
      customer: value,
      issueDate: initialDoc.issueDate,
    });
  };

  const handleIssueDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === initialDoc.issueDate) return;
    saveMetadata({
      title: initialDoc.title,
      customer: initialDoc.customer,
      issueDate: value,
    });
  };

  // ---------- Lines (save on every change) ----------
  // Mantenemos una copia local de las líneas en draft mode para que la UI
  // no parpadee entre la respuesta del server y lo que el usuario está
  // tipeando. La verdad la trae el server — el próximo revalidate va a
  // sobrescribir los importes calculados y los totales, y la longitud del
  // array puede cambiar por add/remove.
  const [localLines, setLocalLines] = useState<LineItemInput[]>(
    initialDoc.lines.map(toLineInput),
  );
  const [lastDocId, setLastDocId] = useState(initialDoc.id);
  const serverLineCount = initialDoc.lines.length;
  useEffect(() => {
    if (initialDoc.id !== lastDocId) {
      setLastDocId(initialDoc.id);
      setLocalLines(initialDoc.lines.map(toLineInput));
      return;
    }
    // Solo resincronizamos si la cantidad de líneas cambió (add/remove):
    // para un edit puntual ya tenemos la versión local más reciente que
    // el usuario está tipeando — pisarla con la respuesta del server
    // podría borrar lo que se tipeó durante el round-trip.
    if (serverLineCount !== localLines.length) {
      setLocalLines(initialDoc.lines.map(toLineInput));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDoc.id, lastDocId, serverLineCount, localLines.length]);

  const handleLineChange = (lineId: string, next: LineItemInput) => {
    if (!isDraft) return;
    setLocalLines((prev) => {
      const idx = initialDoc.lines.findIndex((sl) => sl.id === lineId);
      if (idx < 0 || idx >= prev.length) return prev;
      return prev.map((l, i) => (i === idx ? next : l));
    });
    setLinesError(null);
    setPendingAction(`line:${lineId}`);
    startTransition(async () => {
      const result = await patchLineAction(initialDoc.id, lineId, next);
      setPendingAction((current) =>
        current === `line:${lineId}` ? null : current,
      );
      if (result.error) {
        setLinesError(result.error.message);
        return;
      }
      router.refresh();
    });
  };

  const handleLineRemove = (lineId: string) => {
    if (!isDraft) return;
    setLinesError(null);
    setPendingAction(`line:${lineId}`);
    startTransition(async () => {
      const result = await deleteLineAction(initialDoc.id, lineId);
      setPendingAction((current) =>
        current === `line:${lineId}` ? null : current,
      );
      if (result.error) {
        setLinesError(result.error.message);
        return;
      }
      router.refresh();
    });
  };

  const handleAddLine = () => {
    if (!isDraft) return;
    setLinesError(null);
    setPendingAction("add-line");
    const newLine: LineItemInput = {
      description: "",
      quantity: 1,
      unitPriceCents: 0,
      discount: null,
      taxPercent: 0,
    };
    startTransition(async () => {
      const result = await addLineAction(initialDoc.id, newLine);
      setPendingAction((current) =>
        current === "add-line" ? null : current,
      );
      if (result.error) {
        setLinesError(result.error.message);
        return;
      }
      router.refresh();
    });
  };

  // ---------- Dialogs ----------
  const runAction = (
    kind: Exclude<DialogKind, null>,
    action: () => Promise<{ error: { message: string } | null }>,
  ) => {
    setMetadataError(null);
    setLinesError(null);
    setPendingAction(kind);
    startTransition(async () => {
      const result = await action();
      setPendingAction(null);
      if (result.error) {
        // `finalize`/`delete`/`duplicate` no devuelven `field` (no son
        // formularios): banner global sobre la sección.
        setMetadataError(result.error.message);
        setDialog(null);
        return;
      }
      setDialog(null);
      // Las actions con `redirect` ya navegaron; las demás dejan que
      // `revalidatePath` se ocupe. Llamamos refresh por las dudas.
      router.refresh();
    });
  };

  const handleFinalize = () => {
    if (!isDraft) return;
    runAction("finalize", () => finalizeDocumentAction(initialDoc.id));
  };

  const handleDelete = () => {
    runAction("delete", () => deleteDocumentAction(initialDoc.id));
  };

  const handleDuplicate = () => {
    runAction("duplicate", () => duplicateDocumentAction(initialDoc.id));
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="text-sm text-text-muted hover:underline"
          >
            Documents
          </Link>
          <span className="text-text-muted">/</span>
          <h1 className="text-2xl font-semibold text-text">
            {initialDoc.title}
          </h1>
          <Badge status={initialDoc.status} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/documents/${initialDoc.id}/print`}
            className="inline-flex items-center justify-center rounded-[6px] px-3 py-1.5 text-sm font-medium border border-border-strong bg-bg-subtle text-text hover:bg-bg"
          >
            Print view
          </Link>
        </div>
      </div>

      {!isDraft ? (
        <div className="border border-border bg-bg-subtle rounded-[6px] px-4 py-3 text-sm text-text-muted">
          This document is finalized and can no longer be edited.
        </div>
      ) : null}

      {metadataError ? (
        <div
          role="alert"
          className="border border-danger rounded-[6px] px-4 py-3 text-sm text-danger bg-bg-subtle"
        >
          {metadataError}
        </div>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-[13px] font-medium tracking-[0.04em] uppercase text-text">
            Metadata
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Title"
            defaultValue={initialDoc.title}
            key={`title-${initialDoc.id}`}
            disabled={!isDraft}
            error={fieldErrors.title}
            onBlur={handleTitleBlur}
          />
          <Input
            label="Customer"
            defaultValue={initialDoc.customer}
            key={`customer-${initialDoc.id}`}
            disabled={!isDraft}
            error={fieldErrors.customer}
            onBlur={handleCustomerBlur}
          />
          <Input
            type="date"
            label="Issue date"
            defaultValue={initialDoc.issueDate}
            key={`issueDate-${initialDoc.id}`}
            disabled={!isDraft}
            error={fieldErrors.issueDate}
            onBlur={handleIssueDateBlur}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-[13px] font-medium tracking-[0.04em] uppercase text-text">
            Lines
          </h2>
          {isDraft ? (
            <Button
              variant="secondary"
              onClick={handleAddLine}
              loading={isPending && pendingAction === "add-line"}
              disabled={isPending}
            >
              Add line
            </Button>
          ) : null}
        </div>

        {linesError ? (
          <div
            role="alert"
            className="border border-danger rounded-[6px] px-4 py-3 text-sm text-danger bg-bg-subtle"
          >
            {linesError}
          </div>
        ) : null}

        {isDraft ? (
          <>
            <div className="grid grid-cols-12 gap-2 text-xs text-text-muted px-1 bg-bg-subtle border-b border-border pb-2">
              <div className="col-span-3">Description</div>
              <div className="col-span-1 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit price</div>
              <div className="col-span-2">Discount</div>
              <div className="col-span-2 text-right">Disc. value</div>
              <div className="col-span-1 text-right">Tax %</div>
              <div className="col-span-1" />
            </div>
            {localLines.length === 0 ? (
              <p className="text-sm text-text-muted py-4">
                No lines yet. Click &quot;Add line&quot; to start.
              </p>
            ) : (
              localLines.map((line, idx) => {
                const serverLine = initialDoc.lines[idx];
                const key = serverLine?.id ?? `local-${idx}`;
                return (
                  <LineItemEditor
                    key={key}
                    line={line}
                    onChange={(next) => {
                      if (serverLine) {
                        handleLineChange(serverLine.id, next);
                      }
                    }}
                    onRemove={() => {
                      if (serverLine) {
                        handleLineRemove(serverLine.id);
                      }
                    }}
                  />
                );
              })
            )}
          </>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-text-muted">
                    Description
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-text-muted">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-text-muted">
                    Unit price
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-text-muted">
                    Tax %
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-text-muted">
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody>
                {initialDoc.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border">
                    <td className="px-3 py-2 text-text">{line.description}</td>
                    <td className="px-3 py-2 text-right text-text tabular-nums-col">
                      {line.quantity}
                    </td>
                    <td className="px-3 py-2 text-right text-text tabular-nums-col">
                      {formatCents(line.unitPriceCents)}
                    </td>
                    <td className="px-3 py-2 text-right text-text tabular-nums-col">
                      {line.taxPercent}
                    </td>
                    <td className="px-3 py-2 text-right text-text tabular-nums-col">
                      {formatCents(line.lineTotalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 items-end">
        <DocumentTotals
          subtotalCents={initialDoc.subtotalCents}
          totalDiscountCents={initialDoc.totalDiscountCents}
          totalTaxCents={initialDoc.totalTaxCents}
          grandTotalCents={initialDoc.grandTotalCents}
        />
        <div className="flex items-center gap-2">
          {isDraft ? (
            <Button
              onClick={() => setDialog("finalize")}
              loading={isPending && pendingAction === "finalize"}
              disabled={isPending}
            >
              Finalize
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => setDialog("duplicate")}
            loading={isPending && pendingAction === "duplicate"}
            disabled={isPending}
          >
            Duplicate
          </Button>
          <Button
            variant="danger"
            onClick={() => setDialog("delete")}
            loading={isPending && pendingAction === "delete"}
            disabled={isPending}
          >
            Delete
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={dialog === "finalize"}
        title="Finalize document?"
        description="Once finalized, this document cannot be edited."
        confirmLabel="Finalize"
        onConfirm={handleFinalize}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        title="Delete document?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={dialog === "duplicate"}
        title="Duplicate document?"
        description="A new draft will be created with the same lines."
        confirmLabel="Duplicate"
        onConfirm={handleDuplicate}
        onCancel={closeDialog}
      />
    </div>
  );
}
