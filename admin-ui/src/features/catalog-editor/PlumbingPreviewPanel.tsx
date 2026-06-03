import type { PlumbingSnapshotPreview } from "./api/types";
import { formatMoney } from "./plumbing-catalog-model";

export type PlumbingPreviewPanelProps = {
  preview: PlumbingSnapshotPreview | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
};

export function PlumbingPreviewPanel(props: PlumbingPreviewPanelProps) {
  const { preview, loading, error } = props;
  return (
    <section className="ce-preview">
      <header className="ce-preview-head">
        <div>
          <strong>Превью публичной цены</strong>
          <span className="ce-preview-hint">
            Итог зоны/пакета уже с запечённым резервом — как в публичном снапшоте (источник — БД).
          </span>
        </div>
        <button type="button" className="ce-btn ce-btn-sm" onClick={props.onRefresh} disabled={loading}>
          {loading ? "Считаю…" : "Обновить превью"}
        </button>
      </header>

      {error ? (
        <div className="ce-note ce-note-warn" role="alert">
          <span className="ce-note-tag">Ошибка</span>
          {error}
        </div>
      ) : null}

      {!preview && !loading && !error ? (
        <div className="ce-empty">Нажмите «Обновить превью», чтобы получить публичные суммы из БД.</div>
      ) : null}

      {preview ? (
        <div className="ce-preview-body">
          <div className="ce-meta">
            Версия снапшота: <strong>{preview.version}</strong> · Зон: <strong>{preview.zones.length}</strong> ·
            Позиций: <strong>{preview.items.length}</strong>
          </div>
          <table className="ce-table">
            <thead>
              <tr>
                <th className="ce-col-title">Зона</th>
                <th className="ce-col-select">Подгруппа</th>
                <th className="ce-col-num">Резерв %</th>
                <th className="ce-col-num">Пакет</th>
                <th className="ce-col-num ce-col-total">Публичный итог ₽</th>
              </tr>
            </thead>
            <tbody>
              {preview.zones.map((zone) => {
                const activeRow = zone.packages.find((pkg) => pkg.code === zone.activePackage);
                return (
                  <tr key={zone.code}>
                    <td>{zone.title}</td>
                    <td className="ce-readonly">{zone.subgroup}</td>
                    <td className="ce-num ce-readonly">{zone.riskPercent}</td>
                    <td className="ce-num ce-readonly">
                      {zone.activePackage ? zone.activePackage.toUpperCase() : "—"}
                    </td>
                    <td className="ce-num ce-readonly ce-total-cell">
                      {formatMoney(activeRow ? activeRow.total : zone.total)} ₽
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
