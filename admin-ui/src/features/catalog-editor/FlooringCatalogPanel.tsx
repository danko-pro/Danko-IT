import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createFlooringCovering,
  createFlooringLayout,
  createFlooringPreparation,
  fetchFlooringSnapshot,
} from "./api/flooring-client";
import {
  coveringDraftToPayload,
  layoutDraftToPayload,
  normalizeNum,
  preparationDraftToPayload,
  snapshotToDisplayRows,
} from "./api/flooring-mappers";
import type {
  FlooringCoveringDraft,
  FlooringLayoutDraft,
  FlooringPreparationDraft,
  FlooringSnapshotDisplayRow,
  PublicFlooringSnapshotResponse,
} from "./api/flooring-types";

const SNAPSHOT_MISSING_WARNING =
  "Позиция создана в БД. В public snapshot она появится после backend mapping/F5c/F6.";

function formatMoney(value: number): string {
  return value.toLocaleString("ru-RU");
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("ru-RU")}%`;
}

function consumablesSummaryPerM2(rates: Record<string, number>): string {
  const total =
    normalizeNum(rates.underlayPricePerM2) +
    normalizeNum(rates.adhesivePricePerM2) +
    normalizeNum(rates.primerPricePerM2) +
    normalizeNum(rates.svpPricePerM2) +
    normalizeNum(rates.groutPricePerM2) +
    normalizeNum(rates.toolConsumablesPerM2);
  return `${formatMoney(total)} ₽/м²`;
}

function filterRows(
  rows: FlooringSnapshotDisplayRow[],
  section: FlooringSnapshotDisplayRow["section"],
): FlooringSnapshotDisplayRow[] {
  return rows.filter((row) => row.section === section);
}

function emptyCoveringDraft(): FlooringCoveringDraft {
  return {
    id: 0,
    title: "",
    materialPricePerM2: 0,
    laborPricePerM2: 0,
    baseWastePercent: 0,
    underlayMode: "none",
    underlayConsumptionPerM2: 0,
    glueConsumptionPerM2: 0,
    glueUnit: "kg",
    gluePricePerUnit: 0,
    primerConsumptionPerM2: 0,
    primerUnit: "l",
    primerPricePerUnit: 0,
    svpConsumptionPerM2: 0,
    svpUnit: "pcs",
    svpPricePerUnit: 0,
    groutConsumptionPerM2: 0,
    groutUnit: "kg",
    groutPricePerUnit: 0,
    customConsumables: [],
    needsPlinth: true,
    instrumentPricePerM2: 0,
    note: "",
  };
}

function emptyPreparationDraft(): FlooringPreparationDraft {
  return {
    id: 0,
    title: "",
    laborPricePerM2: 0,
    materialPricePerM2: 0,
    primerConsumptionPerM2: 0,
    primerUnit: "l",
    primerPricePerUnit: 0,
    note: "",
  };
}

function emptyLayoutDraft(): FlooringLayoutDraft {
  return {
    id: 0,
    title: "",
    laborFactor: 1,
    additionalWastePercent: 0,
    note: "",
  };
}

function snapshotHasTitle(
  snapshot: PublicFlooringSnapshotResponse,
  section: "coverings" | "preparations" | "layouts",
  title: string,
): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return false;
  const list =
    section === "coverings"
      ? snapshot.coverings
      : section === "preparations"
        ? snapshot.preparations
        : snapshot.layouts;
  return list.some((item) => item.title.trim().toLowerCase() === normalized);
}

type CreateFormProps = {
  title: string;
  submitting: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
};

function CreateForm({ title, submitting, onSubmit, children }: CreateFormProps) {
  return (
    <form
      className="ce-flooring-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="ce-flooring-form-head">
        <strong>{title}</strong>
        <button type="submit" className="ce-btn ce-btn-primary ce-btn-sm" disabled={submitting}>
          {submitting ? "Создание…" : "Создать"}
        </button>
      </div>
      <div className="ce-flooring-form-fields">{children}</div>
    </form>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
};

function FormField({ label, children }: FormFieldProps) {
  return (
    <label className="ce-flooring-field">
      <span className="ce-flooring-field-label">{label}</span>
      {children}
    </label>
  );
}

export function FlooringCatalogPanel() {
  const [snapshot, setSnapshot] = useState<PublicFlooringSnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const [coveringDraft, setCoveringDraft] = useState(emptyCoveringDraft);
  const [preparationDraft, setPreparationDraft] = useState(emptyPreparationDraft);
  const [layoutDraft, setLayoutDraft] = useState(emptyLayoutDraft);

  const [creatingCovering, setCreatingCovering] = useState(false);
  const [creatingPreparation, setCreatingPreparation] = useState(false);
  const [creatingLayout, setCreatingLayout] = useState(false);

  const reloadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFlooringSnapshot();
      setSnapshot(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить snapshot полов.");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadSnapshot();
  }, [reloadSnapshot]);

  const displayRows = useMemo(
    () => (snapshot ? snapshotToDisplayRows(snapshot) : []),
    [snapshot],
  );
  const coveringRows = useMemo(() => filterRows(displayRows, "coverings"), [displayRows]);
  const preparationRows = useMemo(() => filterRows(displayRows, "preparations"), [displayRows]);
  const layoutRows = useMemo(() => filterRows(displayRows, "layouts"), [displayRows]);

  function updateCoveringNumber(field: keyof FlooringCoveringDraft, value: string) {
    setCoveringDraft((prev) => ({ ...prev, [field]: normalizeNum(value) }));
  }

  function updatePreparationNumber(field: keyof FlooringPreparationDraft, value: string) {
    setPreparationDraft((prev) => ({ ...prev, [field]: normalizeNum(value) }));
  }

  function updateLayoutNumber(field: keyof FlooringLayoutDraft, value: string) {
    setLayoutDraft((prev) => ({ ...prev, [field]: normalizeNum(value) }));
  }

  async function handleCreateCovering() {
    const title = coveringDraft.title.trim();
    if (!title) {
      setError("Укажите название покрытия.");
      return;
    }
    setCreatingCovering(true);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await createFlooringCovering(coveringDraftToPayload({ ...coveringDraft, title }));
      const fresh = await fetchFlooringSnapshot();
      setSnapshot(fresh);
      if (!snapshotHasTitle(fresh, "coverings", title)) {
        setWarningMessage(SNAPSHOT_MISSING_WARNING);
      } else {
        setStatusMessage(`Покрытие «${title}» создано.`);
      }
      setCoveringDraft(emptyCoveringDraft());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать покрытие.");
    } finally {
      setCreatingCovering(false);
    }
  }

  async function handleCreatePreparation() {
    const title = preparationDraft.title.trim();
    if (!title) {
      setError("Укажите название подготовки.");
      return;
    }
    setCreatingPreparation(true);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await createFlooringPreparation(preparationDraftToPayload({ ...preparationDraft, title }));
      const fresh = await fetchFlooringSnapshot();
      setSnapshot(fresh);
      if (!snapshotHasTitle(fresh, "preparations", title)) {
        setWarningMessage(SNAPSHOT_MISSING_WARNING);
      } else {
        setStatusMessage(`Подготовка «${title}» создана.`);
      }
      setPreparationDraft(emptyPreparationDraft());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать подготовку.");
    } finally {
      setCreatingPreparation(false);
    }
  }

  async function handleCreateLayout() {
    const title = layoutDraft.title.trim();
    if (!title) {
      setError("Укажите название укладки.");
      return;
    }
    setCreatingLayout(true);
    setError(null);
    setStatusMessage(null);
    setWarningMessage(null);
    try {
      await createFlooringLayout(layoutDraftToPayload({ ...layoutDraft, title }));
      const fresh = await fetchFlooringSnapshot();
      setSnapshot(fresh);
      if (!snapshotHasTitle(fresh, "layouts", title)) {
        setWarningMessage(SNAPSHOT_MISSING_WARNING);
      } else {
        setStatusMessage(`Укладка «${title}» создана.`);
      }
      setLayoutDraft(emptyLayoutDraft());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать укладку.");
    } finally {
      setCreatingLayout(false);
    }
  }

  if (loading && !snapshot) {
    return <div className="ce-empty">Загрузка snapshot полов…</div>;
  }

  if (!snapshot) {
    return (
      <div className="ce-stub-panel">
        <h2>Полы</h2>
        <p>{error ?? "Не удалось получить snapshot каталога полов."}</p>
        <button type="button" className="ce-btn" onClick={() => void reloadSnapshot()}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="ce-toolbar">
        <div className="ce-toolbar-group">
          <button type="button" className="ce-btn" onClick={() => void reloadSnapshot()} disabled={loading}>
            {loading ? "Обновление…" : "Обновить snapshot"}
          </button>
        </div>
        {statusMessage ? (
          <div className="ce-save-status">
            <span className="ce-dot" aria-hidden="true" />
            {statusMessage}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="ce-note ce-note-warn" role="alert">
          <span className="ce-note-tag">Ошибка</span>
          {error}
        </div>
      ) : null}

      {warningMessage ? (
        <div className="ce-note ce-note-warn" role="alert">
          <span className="ce-note-tag">Snapshot</span>
          {warningMessage}
        </div>
      ) : null}

      <div className="ce-note">
        <span className="ce-note-tag">Модель</span>
        Каталог полов читается из public snapshot (<code>/api/public/catalog/flooring/snapshot</code>).
        Новые позиции создаются через REST API; редактирование и удаление — в следующих итерациях.
      </div>

      <div className="ce-meta">
        Версия snapshot: <strong>{snapshot.version}</strong> · Покрытий:{" "}
        <strong>{coveringRows.length}</strong> · Подготовок: <strong>{preparationRows.length}</strong> · Укладок:{" "}
        <strong>{layoutRows.length}</strong>
      </div>

      <section className="ce-flooring-section">
        <h3 className="ce-flooring-section-title">Покрытия</h3>
        <div className="ce-table-wrap ce-flooring-table-wrap">
          <table className="ce-table ce-flooring-table">
            <thead>
              <tr>
                <th className="ce-col-id">Код</th>
                <th className="ce-col-title">Название</th>
                <th className="ce-col-num">Материал ₽/м²</th>
                <th className="ce-col-num">Работа ₽/м²</th>
                <th className="ce-col-num">Отход %</th>
                <th className="ce-col-tech">Расходники</th>
              </tr>
            </thead>
            <tbody>
              {coveringRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ce-empty">
                    Покрытия не найдены в snapshot.
                  </td>
                </tr>
              ) : (
                coveringRows.map((row) => (
                  <tr key={row.code}>
                    <td className="ce-col-id ce-mono ce-readonly">{row.code}</td>
                    <td className="ce-readonly">{row.title}</td>
                    <td className="ce-num ce-readonly">{formatMoney(row.rates.materialPricePerM2)}</td>
                    <td className="ce-num ce-readonly">{formatMoney(row.rates.laborPricePerM2)}</td>
                    <td className="ce-num ce-readonly">{formatPercent(row.rates.baseWastePercent)}</td>
                    <td className="ce-readonly">{consumablesSummaryPerM2(row.rates)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <CreateForm title="Новое покрытие" submitting={creatingCovering} onSubmit={() => void handleCreateCovering()}>
          <FormField label="Название">
            <input
              className="ce-input"
              value={coveringDraft.title}
              onChange={(event) => setCoveringDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Керамогранит"
            />
          </FormField>
          <FormField label="Материал ₽/м²">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              value={coveringDraft.materialPricePerM2 || ""}
              onChange={(event) => updateCoveringNumber("materialPricePerM2", event.target.value)}
            />
          </FormField>
          <FormField label="Работа ₽/м²">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              value={coveringDraft.laborPricePerM2 || ""}
              onChange={(event) => updateCoveringNumber("laborPricePerM2", event.target.value)}
            />
          </FormField>
          <FormField label="Отход %">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              value={coveringDraft.baseWastePercent || ""}
              onChange={(event) => updateCoveringNumber("baseWastePercent", event.target.value)}
            />
          </FormField>
          <FormField label="Инструмент ₽/м²">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              value={coveringDraft.instrumentPricePerM2 || ""}
              onChange={(event) => updateCoveringNumber("instrumentPricePerM2", event.target.value)}
            />
          </FormField>
          <FormField label="Нужен плинтус">
            <select
              className="ce-input"
              value={coveringDraft.needsPlinth ? "1" : "0"}
              onChange={(event) =>
                setCoveringDraft((prev) => ({ ...prev, needsPlinth: event.target.value === "1" }))
              }
            >
              <option value="1">Да</option>
              <option value="0">Нет</option>
            </select>
          </FormField>
        </CreateForm>
      </section>

      <section className="ce-flooring-section">
        <h3 className="ce-flooring-section-title">Подготовка</h3>
        <div className="ce-table-wrap ce-flooring-table-wrap">
          <table className="ce-table ce-flooring-table">
            <thead>
              <tr>
                <th className="ce-col-id">Код</th>
                <th className="ce-col-title">Название</th>
                <th className="ce-col-num">Работа ₽/м²</th>
                <th className="ce-col-num">Материал ₽/м²</th>
              </tr>
            </thead>
            <tbody>
              {preparationRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ce-empty">
                    Подготовки не найдены в snapshot.
                  </td>
                </tr>
              ) : (
                preparationRows.map((row) => (
                  <tr key={row.code}>
                    <td className="ce-col-id ce-mono ce-readonly">{row.code}</td>
                    <td className="ce-readonly">{row.title}</td>
                    <td className="ce-num ce-readonly">{formatMoney(row.rates.laborPricePerM2)}</td>
                    <td className="ce-num ce-readonly">{formatMoney(row.rates.materialPricePerM2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <CreateForm
          title="Новая подготовка"
          submitting={creatingPreparation}
          onSubmit={() => void handleCreatePreparation()}
        >
          <FormField label="Название">
            <input
              className="ce-input"
              value={preparationDraft.title}
              onChange={(event) => setPreparationDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Грунтование"
            />
          </FormField>
          <FormField label="Работа ₽/м²">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              value={preparationDraft.laborPricePerM2 || ""}
              onChange={(event) => updatePreparationNumber("laborPricePerM2", event.target.value)}
            />
          </FormField>
          <FormField label="Материал ₽/м²">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              value={preparationDraft.materialPricePerM2 || ""}
              onChange={(event) => updatePreparationNumber("materialPricePerM2", event.target.value)}
            />
          </FormField>
        </CreateForm>
      </section>

      <section className="ce-flooring-section">
        <h3 className="ce-flooring-section-title">Укладка</h3>
        <div className="ce-table-wrap ce-flooring-table-wrap">
          <table className="ce-table ce-flooring-table">
            <thead>
              <tr>
                <th className="ce-col-id">Код</th>
                <th className="ce-col-title">Название</th>
                <th className="ce-col-num">Коэф. работы</th>
                <th className="ce-col-num">Доп. отход %</th>
              </tr>
            </thead>
            <tbody>
              {layoutRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ce-empty">
                    Укладки не найдены в snapshot.
                  </td>
                </tr>
              ) : (
                layoutRows.map((row) => (
                  <tr key={row.code}>
                    <td className="ce-col-id ce-mono ce-readonly">{row.code}</td>
                    <td className="ce-readonly">{row.title}</td>
                    <td className="ce-num ce-readonly">{row.rates.laborFactor}</td>
                    <td className="ce-num ce-readonly">{formatPercent(row.rates.additionalWastePercent)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <CreateForm title="Новая укладка" submitting={creatingLayout} onSubmit={() => void handleCreateLayout()}>
          <FormField label="Название">
            <input
              className="ce-input"
              value={layoutDraft.title}
              onChange={(event) => setLayoutDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Прямая"
            />
          </FormField>
          <FormField label="Коэф. работы">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              min={0}
              value={layoutDraft.laborFactor || ""}
              onChange={(event) => updateLayoutNumber("laborFactor", event.target.value)}
            />
          </FormField>
          <FormField label="Доп. отход %">
            <input
              className="ce-input ce-num"
              type="number"
              step="0.01"
              value={layoutDraft.additionalWastePercent || ""}
              onChange={(event) => updateLayoutNumber("additionalWastePercent", event.target.value)}
            />
          </FormField>
        </CreateForm>
      </section>
    </>
  );
}
