import type { WarmFloorCatalogController } from "./api/warm-floor-client";
import { useCatalogPersistedStringSet } from "./useCatalogPersistedState";
import { useCatalogTableColumns } from "./useCatalogTableColumns";
import {
  ELECTRIC_WARM_FLOOR_RATE_FIELDS,
  WATER_WARM_FLOOR_RATE_FIELDS,
} from "./warm-floor-rate-fields";
import { WarmFloorRateCard } from "./WarmFloorRateCard";
import {
  WARM_FLOOR_RATE_DEFAULT_COLUMNS,
  WARM_FLOOR_RATE_MIN_COLUMN_WIDTH,
} from "./WarmFloorRateTableColumns";
import { WarmFloorSnapshotPreviewPanel } from "./WarmFloorSnapshotPreviewPanel";

type WarmFloorCatalogPanelProps = {
  controller: WarmFloorCatalogController;
};

const WATER_CARD_ID = "water";
const ELECTRIC_CARD_ID = "electric";

function formatMoney(value: number): string {
  return value.toLocaleString("ru-RU");
}

export function WarmFloorCatalogPanel({ controller }: WarmFloorCatalogPanelProps) {
  const { config } = controller;
  const [collapsedCards, setCollapsedCards] = useCatalogPersistedStringSet("warm-floor:collapsed-rate-cards");
  const rateTableControls = useCatalogTableColumns({
    defaultColumns: WARM_FLOOR_RATE_DEFAULT_COLUMNS,
    minColumnWidths: WARM_FLOOR_RATE_MIN_COLUMN_WIDTH,
    storageKey: "warm-floor:rate-columns",
  });

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

  function toggleRateCard(cardId: string) {
    setCollapsedCards((current) => {
      const next = new Set(current);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  const smallLoopTotal =
    config.small_loop_fittings_material + config.small_loop_control_head_material + config.small_loop_connection_labor;
  const electricFixedTotal =
    config.electric_breaker_material +
    config.thermostat_material +
    config.electric_wire_material +
    config.electric_installation_labor;

  return (
    <div className="ce-warm-floor-panel">
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

      <div className="ce-warm-floor-rate-grid">
        <WarmFloorRateCard
          id={WATER_CARD_ID}
          title="Водяной теплый пол"
          fields={WATER_WARM_FLOOR_RATE_FIELDS}
          config={config}
          controls={rateTableControls}
          collapsed={collapsedCards.has(WATER_CARD_ID)}
          summary={
            <>
              <span>{WATER_WARM_FLOOR_RATE_FIELDS.length} тарифов</span>
              <strong>{formatMoney(smallLoopTotal)} ₽</strong>
            </>
          }
          onToggle={() => toggleRateCard(WATER_CARD_ID)}
          onUpdate={controller.updateField}
        />
        <WarmFloorRateCard
          id={ELECTRIC_CARD_ID}
          title="Электрический теплый пол"
          fields={ELECTRIC_WARM_FLOOR_RATE_FIELDS}
          config={config}
          controls={rateTableControls}
          collapsed={collapsedCards.has(ELECTRIC_CARD_ID)}
          summary={
            <>
              <span>{ELECTRIC_WARM_FLOOR_RATE_FIELDS.length} тарифов</span>
              <strong>{formatMoney(electricFixedTotal)} ₽</strong>
            </>
          }
          onToggle={() => toggleRateCard(ELECTRIC_CARD_ID)}
          onUpdate={controller.updateField}
        />
      </div>

      <div className="ce-meta ce-warm-floor-summary">
        Текущие ориентиры: малый контур ={" "}
        <strong>
          {formatMoney(smallLoopTotal)}{" "}
          ₽
        </strong>{" "}
        без трубы/штробы/м² работ; электрический фикс ={" "}
        <strong>
          {formatMoney(electricFixedTotal)}{" "}
          ₽
        </strong>{" "}
        + мат по площади.
      </div>

      {controller.preview ? <WarmFloorSnapshotPreviewPanel preview={controller.preview} /> : null}
    </div>
  );
}
