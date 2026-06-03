import { FlooringAssemblyBlock } from "./FlooringAssemblyBlock";
import { FlooringAssemblyLibraryPanel } from "./FlooringAssemblyLibraryPanel";
import {
  FlooringCoveringEditForm,
  FlooringLayoutEditForm,
  FlooringPreparationEditForm,
} from "./FlooringCatalogEditForms";
import { FlooringCatalogWorkspace } from "./FlooringCatalogWorkspace";
import { useFlooringCatalogPanel } from "./useFlooringCatalogPanel";

export function FlooringCatalogPanel() {
  const {
    snapshot,
    loading,
    error,
    statusMessage,
    warningMessage,
    coveringDraft,
    setCoveringDraft,
    preparationDraft,
    setPreparationDraft,
    layoutDraft,
    setLayoutDraft,
    assemblyDraft,
    setAssemblyDraft,
    assemblyCatalog,
    editingCoveringId,
    editingPreparationId,
    editingLayoutId,
    editingAssemblyId,
    creatingAssembly,
    savingCovering,
    savingPreparation,
    savingLayout,
    savingAssembly,
    assemblyTarget,
    setAssemblyTarget,
    assemblyResetKey,
    assemblyInitialRows,
    assemblyInitialTitle,
    assemblyLoading,
    flooringView,
    setFlooringView,
    coveringRows,
    preparationRows,
    layoutRows,
    assemblyLibraryItems,
    reloadSnapshot,
    createAssemblyTargetRow,
    updateCoveringNumber,
    updatePreparationNumber,
    updateLayoutNumber,
    updateAssemblyNumber,
    beginEditAssemblyItem,
    cancelAssemblyEdit,
    handleCreateAssemblyItem,
    handleUpdateAssemblyItem,
    handleDeleteAssemblyItem,
    beginEditCovering,
    beginEditPreparation,
    beginEditLayout,
    cancelCoveringEdit,
    cancelPreparationEdit,
    cancelLayoutEdit,
    handleUpdateCovering,
    handleUpdatePreparation,
    handleUpdateLayout,
    handleDeleteCovering,
    handleDeletePreparation,
    handleDeleteLayout,
    promoteSnapshotRowToCatalog,
    setAssemblyRowsSnapshot,
    formatMoney,
    formatPercent,
    consumablesSummaryPerM2,
  } = useFlooringCatalogPanel();

  if (loading && !snapshot) {
    return <div className="ce-empty ce-flooring-shell flooring-catalog-panel">Загрузка snapshot полов…</div>;
  }

  if (!snapshot) {
    return (
      <div className="ce-stub-panel ce-flooring-shell flooring-catalog-panel">
        <h2>Полы</h2>
        <p>{error ?? "Не удалось получить snapshot каталога полов."}</p>
        <button type="button" className="ce-btn" onClick={() => void reloadSnapshot()}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <section className="ce-flooring-shell flooring-catalog-panel">
      <div className="ce-toolbar ce-flooring-toolbar">
        <div className="ce-toolbar-group">
          <button
            type="button"
            className={flooringView === "library" ? "ce-btn ce-btn-primary" : "ce-btn"}
            onClick={() => setFlooringView((view) => (view === "library" ? "catalog" : "library"))}
          >
            {flooringView === "library" ? "← К сборке и каталогу полов" : "Библиотека кубиков"}
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

      <div className="ce-meta ce-flooring-meta">
        Snapshot v<strong>{snapshot.version}</strong> · Покрытий <strong>{coveringRows.length}</strong> · Подготовок{" "}
        <strong>{preparationRows.length}</strong> · Укладок <strong>{layoutRows.length}</strong>
        <span className="ce-flooring-meta-sep">·</span>
        <span className="ce-flooring-meta-note">
          public snapshot + REST API (без reorder)
        </span>
      </div>

      {flooringView === "library" ? (
        <FlooringAssemblyLibraryPanel
          assemblyCatalog={assemblyCatalog}
          assemblyDraft={assemblyDraft}
          editingAssemblyId={editingAssemblyId}
          creatingAssembly={creatingAssembly}
          savingAssembly={savingAssembly}
          onBeginEditAssemblyItem={beginEditAssemblyItem}
          onDeleteAssemblyItem={handleDeleteAssemblyItem}
          onCancelAssemblyEdit={cancelAssemblyEdit}
          onSubmitAssemblyItem={() => {
            void (editingAssemblyId ? handleUpdateAssemblyItem() : handleCreateAssemblyItem());
          }}
          onAssemblyDraftChange={setAssemblyDraft}
          onAssemblyNumberChange={updateAssemblyNumber}
          formatMoney={formatMoney}
        />
      ) : null}
      {flooringView === "catalog" ? (
        <>
      <FlooringAssemblyBlock
        libraryItems={assemblyLibraryItems}
        target={assemblyTarget}
        onTargetChange={setAssemblyTarget}
        formatMoney={formatMoney}
        onRowsChange={setAssemblyRowsSnapshot}
        onCreateFromAssembly={createAssemblyTargetRow}
        initialRows={assemblyInitialRows}
        initialTitle={assemblyInitialTitle}
        resetKey={assemblyResetKey}
        loadingAssembly={assemblyLoading}
      />

      <FlooringCatalogWorkspace
        coverings={{
          rows: coveringRows,
          selectedId: editingCoveringId,
          onEdit: beginEditCovering,
          onDelete: handleDeleteCovering,
          onPromote: (row) => void promoteSnapshotRowToCatalog(row),
        }}
        preparations={{
          rows: preparationRows,
          selectedId: editingPreparationId,
          onEdit: beginEditPreparation,
          onDelete: handleDeletePreparation,
          onPromote: (row) => void promoteSnapshotRowToCatalog(row),
        }}
        layouts={{
          rows: layoutRows,
          selectedId: editingLayoutId,
          onEdit: beginEditLayout,
          onDelete: handleDeleteLayout,
          onPromote: (row) => void promoteSnapshotRowToCatalog(row),
        }}
        formatMoney={formatMoney}
        formatPercent={formatPercent}
        consumablesSummaryPerM2={consumablesSummaryPerM2}
        editor={
          editingCoveringId !== null ? (
            <FlooringCoveringEditForm
              draft={coveringDraft}
              submitting={savingCovering}
              onSubmit={() => void handleUpdateCovering()}
              onCancel={cancelCoveringEdit}
              onDraftChange={setCoveringDraft}
              onNumberChange={updateCoveringNumber}
              formatMoney={formatMoney}
              formatPercent={formatPercent}
            />
          ) : editingPreparationId !== null ? (
            <FlooringPreparationEditForm
              draft={preparationDraft}
              submitting={savingPreparation}
              onSubmit={() => void handleUpdatePreparation()}
              onCancel={cancelPreparationEdit}
              onDraftChange={setPreparationDraft}
              onNumberChange={updatePreparationNumber}
            />
          ) : editingLayoutId !== null ? (
            <FlooringLayoutEditForm
              draft={layoutDraft}
              submitting={savingLayout}
              onSubmit={() => void handleUpdateLayout()}
              onCancel={cancelLayoutEdit}
              onDraftChange={setLayoutDraft}
              onNumberChange={updateLayoutNumber}
            />
          ) : null
        }
      />
        </>
      ) : null}

      <div className="ce-service-toolbar">
        <div className="ce-service-toolbar-copy">
          <strong>Служебно</strong>
          <span>Перечитать public snapshot, если данные были изменены вне этой страницы.</span>
        </div>
        <button type="button" className="ce-btn" onClick={() => void reloadSnapshot()} disabled={loading}>
          {loading ? "Перечитываю…" : "Перечитать snapshot"}
        </button>
      </div>
    </section>
  );
}
