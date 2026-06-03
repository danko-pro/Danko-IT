import type { WarmFloorSnapshotPreview } from "./api/types";

export function WarmFloorSnapshotPreviewPanel({ preview }: { preview: WarmFloorSnapshotPreview }) {
  return (
    <section className="ce-preview">
      <header className="ce-preview-head">
        <div>
          <strong>Preview public snapshot</strong>
          <span className="ce-preview-hint">Именно этот payload попадет в build-time snapshot публичного сайта.</span>
        </div>
      </header>
      <div className="ce-meta">
        Версия: <strong>{preview.version}</strong> · Водяных тарифов:{" "}
        <strong>{Object.keys(preview.water).length}</strong> · Электрических тарифов:{" "}
        <strong>{Object.keys(preview.electric).length}</strong>
      </div>
      <div className="ce-note">
        <span className="ce-note-tag">Публично</span>
        Snapshot содержит только готовые тарифы расчета, без пользовательских проектов и без CRM-данных.
      </div>
    </section>
  );
}
