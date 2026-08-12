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

  const metadataBanner =
    metadataError ??
    (fieldErrors.title ? `Title: ${fieldErrors.title}` : null) ??
    (fieldErrors.customer ? `Customer: ${fieldErrors.customer}` : null) ??
    (fieldErrors.issueDate ? `Issue date: ${fieldErrors.issueDate}` : null);

  return (
    <div className="py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="text-sm text-text-muted hover:underline"
          >
            Documents
          </Link>
          <span className="text-text-muted">/</span>
          <h1 className="text-2xl font-label tracking-[-0.01em] text-text">
            {initialDoc.title}
          </h1>
          <Badge status={initialDoc.status} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/documents/${initialDoc.id}/print`}
            className="inline-flex items-center justify-center rounded-[6px] px-3 py-1.5 text-sm font-label border border-border-strong bg-bg-subtle text-text hover:bg-bg"
          >
            Print view
          </Link>
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
      </div>

      {!isDraft ? (
        <div className="border border-border bg-bg-subtle rounded-[6px] px-4 py-3 text-sm text-text-muted">
          This document is finalized and can no longer be edited.
        </div>
      ) : null}

      {metadataBanner ? (
        <div
          role="alert"
          className="border border-danger rounded-[6px] px-4 py-3 text-[13px] text-danger bg-danger-subtle"
        >
          {metadataBanner}
        </div>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-xs font-label tracking-[0.04em] uppercase text-text-muted">
            Metadata
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isDraft ? (
            <>
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
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-label text-text-muted">
                  Title
                </span>
                <span className="text-sm text-text">{initialDoc.title}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-label text-text-muted">
                  Customer
                </span>
                <span className="text-sm text-text">
                  {initialDoc.customer}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-label text-text-muted">
                  Issue date
                </span>
                <span className="text-sm text-text">
                  {initialDoc.issueDate}
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="border-b border-border pb-2">
          <h2 className="text-xs font-label tracking-[0.04em] uppercase text-text-muted">
            Lines
          </h2>
        </div>
        {linesError ? (
          <div
            role="alert"
            className="border border-danger rounded-[6px] px-4 py-3 text-[13px] text-danger bg-danger-subtle"
          >
            {linesError}
          </div>
        ) : null}

        {isDraft ? (
          <>
            <div className="grid grid-cols-[32px_1fr_80px_120px_140px_120px_90px_40px] gap-2 text-xs text-text-muted font-label bg-bg-subtle border-b border-border pb-2">
              <div />
              <div>Description</div>
              <div className="text-right">Qty</div>
              <div className="text-right">Unit price</div>
              <div>Discount</div>
              <div className="text-right">Disc. value</div>
              <div className="text-right">Tax %</div>
              <div />
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
                    index={idx + 1}
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
            <div className="flex justify-start">
              <Button
                variant="secondary"
                onClick={handleAddLine}
                loading={isPending && pendingAction === "add-line"}
                disabled={isPending}
              >
                Add line
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-[32px_1fr_80px_120px_90px_300px] gap-2 text-xs text-text-muted font-label bg-bg-subtle border-b border-border pb-2">
              <div />
              <div>Description</div>
              <div className="text-right">Qty</div>
              <div className="text-right">Unit price</div>
              <div className="text-right">Tax %</div>
              <div className="text-right">Line total</div>
            </div>
            {initialDoc.lines.map((line, idx) => (
              <div
                key={line.id}
                className="grid grid-cols-[32px_1fr_80px_120px_90px_300px] gap-2 items-center py-3 border-b border-border"
              >
                <div className="text-right text-text-muted tabular-nums">
                  {idx + 1}
                </div>
                <div className="text-text">{line.description}</div>
                <div className="text-right text-text tabular-nums">
                  {line.quantity}
                </div>
                <div className="text-right text-text tabular-nums font-mono">
                  {formatCents(line.unitPriceCents)}
                </div>
                <div className="text-right text-text tabular-nums font-mono">
                  {line.taxPercent}
                </div>
                <div className="text-right text-text tabular-nums font-mono">
                  {formatCents(line.lineTotalCents)}
                </div>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3 items-end">
        <DocumentTotals
          subtotalCents={initialDoc.subtotalCents}
          totalDiscountCents={initialDoc.totalDiscountCents}
          totalTaxCents={initialDoc.totalTaxCents}
          grandTotalCents={initialDoc.grandTotalCents}
        />
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
