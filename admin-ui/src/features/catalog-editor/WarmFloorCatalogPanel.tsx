import type { PublicWarmFloorConfigDto, PublicWarmFloorRateField, WarmFloorSnapshotPreview } from "./api/types";
import type { WarmFloorCatalogController } from "./api/warm-floor-client";

type RateField = {
  key: PublicWarmFloorRateField;
  label: string;
  unit: string;
};

const WATER_FIELDS: RateField[] = [
  { key: "water_labor_rate_per_m2", label: "Монтаж водяного теплого пола", unit: "₽/м²" },
  { key: "pipe_meters_per_m2", label: "Труба на 1 м²", unit: "м/м²" },
  { key: "max_circuit_area_m2", label: "Максимальная площадь контура", unit: "м²" },
  { key: "pump_room_threshold", label: "Насос от количества помещений", unit: "шт" },
  { key: "pump_circuit_threshold", label: "Насос от количества контуров", unit: "шт" },
  { key: "pipe_price_per_meter", label: "Труба PE-RT за метр", unit: "₽/м" },
  { key: "chase_labor_per_meter", label: "Штробление трассы", unit: "₽/м" },
  { key: "small_loop_fittings_material", label: "Материалы малого контура", unit: "₽" },
  { key: "small_loop_control_head_material", label: "Термоголовка малого контура", unit: "₽" },
  { key: "small_loop_connection_labor", label: "Подключение малого контура", unit: "₽" },
  { key: "manifold_labor", label: "Монтаж распределительной гребенки", unit: "₽" },
  { key: "manifold_material", label: "Комплект распределительной гребенки", unit: "₽" },
  { key: "pump_labor", label: "Монтаж насосного узла", unit: "₽" },
  { key: "pump_material", label: "Материалы насосного узла", unit: "₽" },
];

const ELECTRIC_FIELDS: RateField[] = [
  { key: "electric_mat_price_per_m2", label: "Мат электрического теплого пола", unit: "₽/м²" },
  { key: "electric_breaker_material", label: "Автоматический выключатель", unit: "₽" },
  { key: "thermostat_material", label: "Терморегулятор", unit: "₽" },
  { key: "electric_wire_material", label: "Провод 3х2,5", unit: "₽" },
  { key: "electric_installation_labor", label: "Монтаж электрического теплого пола", unit: "₽" },
];

type WarmFloorCatalogPanelProps = {
  controller: WarmFloorCatalogController;
};

function formatMoney(value: number): string {
  return value.toLocaleString("ru-RU");
}

function renderRows(
  config: PublicWarmFloorConfigDto,
  fields: RateField[],
  onUpdate: (field: PublicWarmFloorRateField, value: string) => void,
) {
  return fields.map((field) => (
    <tr key={field.key}>
      <td>{field.label}</td>
      <td className="ce-readonly">{field.unit}</td>
      <td>
        <input
          className="ce-cell-input ce-num"
          type="number"
          step="0.01"
          value={config[field.key]}
          onChange={(event) => onUpdate(field.key, event.target.value)}
        />
      </td>
    </tr>
  ));
}

function SnapshotPreview({ preview }: { preview: WarmFloorSnapshotPreview }) {
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

export function WarmFloorCatalogPanel({ controller }: WarmFloorCatalogPanelProps) {
  const { config } = controller;

  if (controller.loading) {
    return <div className="ce-empty">Загрузка тарифов теплого пола из БД...</div>;
  }

  if (!config) {
    return (
      <div className="ce-stub-panel">
        <h2>Теплый пол</h2>
        <p>Не удалось получить конфигурацию тарифов.</p>
      </div>
    );
  }

  return (
    <>
      <div className="ce-toolbar">
        <div className="ce-toolbar-group">
          <button type="button" className="ce-btn ce-btn-primary" onClick={() => void controller.save()}>
            {controller.saving ? "Сохранение..." : "Сохранить тарифы"}
          </button>
          <button type="button" className="ce-btn" onClick={() => void controller.loadPreview()}>
            {controller.previewLoading ? "Считаю preview..." : "Preview snapshot"}
          </button>
          <button type="button" className="ce-btn" onClick={() => void controller.reload()}>
            Обновить из БД
          </button>
        </div>
        <div className="ce-save-status">
          <span className="ce-dot" aria-hidden="true" />
          {controller.saving
            ? "Сохранение..."
            : `Сохранено в БД${controller.savedAt ? ` · ${controller.savedAt}` : ""}`}
        </div>
      </div>

      {controller.error ? (
        <div className="ce-note ce-note-warn" role="alert">
          <span className="ce-note-tag">Ошибка</span>
          {controller.error}
        </div>
      ) : null}

      {controller.previewError ? (
        <div className="ce-note ce-note-warn" role="alert">
          <span className="ce-note-tag">Preview</span>
          {controller.previewError}
        </div>
      ) : null}

      <div className="ce-note">
        <span className="ce-note-tag">Модель</span>
        Малый водяной контур питается от существующего водяного полотенцесушителя; полотенцесушитель убирается,
        ставится термоголовка. Электрический теплый пол считает мат, автомат, терморегулятор, провод и монтаж.
      </div>

      <div className="ce-table-wrap">
        <table className="ce-table">
          <thead>
            <tr>
              <th className="ce-col-title">Водяной теплый пол</th>
              <th className="ce-col-select">Ед.</th>
              <th className="ce-col-num">Значение</th>
            </tr>
          </thead>
          <tbody>{renderRows(config, WATER_FIELDS, controller.updateField)}</tbody>
        </table>
      </div>

      <div className="ce-table-wrap" style={{ marginTop: 14 }}>
        <table className="ce-table">
          <thead>
            <tr>
              <th className="ce-col-title">Электрический теплый пол</th>
              <th className="ce-col-select">Ед.</th>
              <th className="ce-col-num">Значение</th>
            </tr>
          </thead>
          <tbody>{renderRows(config, ELECTRIC_FIELDS, controller.updateField)}</tbody>
        </table>
      </div>

      <div className="ce-meta" style={{ marginTop: 12 }}>
        Текущие ориентиры: малый контур ={" "}
        <strong>
          {formatMoney(
            config.small_loop_fittings_material +
              config.small_loop_control_head_material +
              config.small_loop_connection_labor,
          )}{" "}
          ₽
        </strong>{" "}
        без трубы/штробы/м² работ; электрический фикс ={" "}
        <strong>
          {formatMoney(
            config.electric_breaker_material +
              config.thermostat_material +
              config.electric_wire_material +
              config.electric_installation_labor,
          )}{" "}
          ₽
        </strong>{" "}
        + мат по площади.
      </div>

      {controller.preview ? <SnapshotPreview preview={controller.preview} /> : null}
    </>
  );
}
