import { useMemo, useState } from "react";
import {
  calculateEstimateGeometryTotals,
  calculateEstimateRoomGeometry,
  parseEstimateDecimal,
  type EstimateRoomInput,
  type EstimateRoomType,
} from "./public-estimate-geometry";
import {
  calculateFlooring,
  type FlooringCoveringType,
  type FlooringLayoutType,
  type FlooringPlinthType,
  type FlooringPreparationType,
} from "./public-estimate-flooring";
import { calculateEstimateTotals } from "./public-estimate-model";
import { calculateWarmFloor, type WarmFloorMode } from "./public-estimate-warm-floor";

const estimateSteps = [
  "объект и помещения",
  "объём объекта",
  "стены и полы",
  "тёплый пол",
  "потолки, электрика, сантехника",
  "итоговая смета",
  "скачать / отправить заявку",
];

const roomTypeOptions: Array<{ value: EstimateRoomType; label: string }> = [
  { value: "living_room", label: "Комната" },
  { value: "kitchen", label: "Кухня" },
  { value: "bathroom", label: "Санузел" },
  { value: "hallway", label: "Прихожая" },
  { value: "balcony", label: "Балкон" },
  { value: "other", label: "Другое" },
];

const flooringCoveringOptions: Array<{ value: FlooringCoveringType; label: string }> = [
  { value: "porcelain", label: "Керамогранит" },
  { value: "quartz_vinyl", label: "Кварцвинил" },
  { value: "laminate", label: "Ламинат" },
  { value: "carpet", label: "Ковролин" },
  { value: "engineered_wood", label: "Инженерная доска" },
];

const flooringPreparationOptions: Array<{ value: FlooringPreparationType; label: string }> = [
  { value: "none", label: "Без подготовки" },
  { value: "primer", label: "Грунтование" },
  { value: "self_leveling", label: "Наливной пол" },
  { value: "waterproofing", label: "Гидроизоляция" },
];

const flooringLayoutOptions: Array<{ value: FlooringLayoutType; label: string }> = [
  { value: "straight", label: "Прямая" },
  { value: "large_format_straight", label: "Крупный формат" },
  { value: "glue", label: "Клеевая" },
  { value: "floating", label: "Плавающая" },
];

const flooringPlinthOptions: Array<{ value: FlooringPlinthType; label: string }> = [
  { value: "none", label: "Без плинтуса" },
  { value: "duropolymer", label: "Дюрополимерный" },
  { value: "painted_mdf", label: "МДФ окрашенный" },
];

type EstimateRoomDraft = Omit<EstimateRoomInput, "area" | "doorCount" | "windowCount"> & {
  area: string;
  doorCount: string;
  windowCount: string;
};

type WarmFloorRoomDraft = {
  isSelected?: boolean;
  warmFloorArea?: string;
};

type FlooringRoomDraft = {
  isIncluded?: boolean;
  coveringType?: FlooringCoveringType;
  preparationType?: FlooringPreparationType;
  layoutType?: FlooringLayoutType;
};

type FlooringOptionsDraft = {
  includePlinth: boolean;
  plinthType: FlooringPlinthType;
  includeThresholds: boolean;
  thresholdCount: string;
  includeDemolition: boolean;
};

const FLOORING_SPEC_COLLAPSED_LIMIT = 10;

const initialRooms: EstimateRoomDraft[] = [
  { id: "hallway", name: "Прихожая", type: "hallway", area: "6.5", doorCount: "1", windowCount: "0" },
  { id: "kitchen", name: "Кухня", type: "kitchen", area: "12", doorCount: "1", windowCount: "1" },
  { id: "living-room", name: "Комната", type: "living_room", area: "18", doorCount: "1", windowCount: "1" },
  { id: "bathroom", name: "Санузел", type: "bathroom", area: "4.3", doorCount: "1", windowCount: "0" },
  { id: "balcony", name: "Балкон", type: "balcony", area: "2.2", doorCount: "1", windowCount: "1" },
];

function normalizeRoom(room: EstimateRoomDraft): EstimateRoomInput {
  return {
    ...room,
    area: parseEstimateDecimal(room.area),
    doorCount: parseEstimateDecimal(room.doorCount),
    windowCount: parseEstimateDecimal(room.windowCount),
  };
}

function formatMeasurement(value: number, unit: "м" | "м²" | "м.п.") {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)} ${unit}`;
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value)} ₽`;
}

function formatEstimateQuantity(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

function createEstimateRoom(): EstimateRoomDraft {
  return {
    id: `room-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: "Новое помещение",
    type: "other",
    area: "10",
    doorCount: "1",
    windowCount: "0",
  };
}

function getDefaultFlooringCovering(roomType: EstimateRoomType): FlooringCoveringType {
  if (roomType === "living_room") {
    return "carpet";
  }

  if (roomType === "other") {
    return "quartz_vinyl";
  }

  return "porcelain";
}

function getDefaultFlooringPreparation(roomType: EstimateRoomType): FlooringPreparationType {
  return roomType === "living_room" ? "self_leveling" : "primer";
}

function getDefaultFlooringLayout(coveringType: FlooringCoveringType): FlooringLayoutType {
  if (coveringType === "porcelain") {
    return "large_format_straight";
  }

  if (coveringType === "carpet" || coveringType === "engineered_wood") {
    return "glue";
  }

  if (coveringType === "laminate") {
    return "floating";
  }

  return "straight";
}

export function PublicEstimate() {
  const [ceilingHeightInput, setCeilingHeightInput] = useState("2.7");
  const [rooms, setRooms] = useState<EstimateRoomDraft[]>(initialRooms);
  const [warmFloorMode, setWarmFloorMode] = useState<WarmFloorMode>("water");
  const [warmFloorRooms, setWarmFloorRooms] = useState<Record<string, WarmFloorRoomDraft>>({});
  const [flooringRooms, setFlooringRooms] = useState<Record<string, FlooringRoomDraft>>({});
  const [flooringOptions, setFlooringOptions] = useState<FlooringOptionsDraft>({
    includePlinth: true,
    plinthType: "duropolymer",
    includeThresholds: false,
    thresholdCount: "0",
    includeDemolition: false,
  });
  const [isFlooringSpecExpanded, setIsFlooringSpecExpanded] = useState(false);

  const ceilingHeight = useMemo(() => parseEstimateDecimal(ceilingHeightInput), [ceilingHeightInput]);
  const roomInputs = useMemo(() => rooms.map(normalizeRoom), [rooms]);
  const roomGeometries = useMemo(
    () => roomInputs.map((room) => calculateEstimateRoomGeometry(room, ceilingHeight)),
    [roomInputs, ceilingHeight],
  );
  const totals = useMemo(() => calculateEstimateGeometryTotals(roomGeometries), [roomGeometries]);
  const warmFloorRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const warmFloorDraft = warmFloorRooms[room.id] ?? {};

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          area: roomInputs[index]?.area ?? 0,
          isSelected: warmFloorDraft.isSelected ?? room.type === "bathroom",
          warmFloorArea: parseEstimateDecimal(warmFloorDraft.warmFloorArea ?? room.area),
        };
      }),
    [roomInputs, rooms, warmFloorRooms],
  );
  const warmFloorResult = useMemo(
    () => calculateWarmFloor(warmFloorMode, warmFloorRoomInputs),
    [warmFloorMode, warmFloorRoomInputs],
  );
  const flooringRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const flooringDraft = flooringRooms[room.id] ?? {};
        const coveringType = flooringDraft.coveringType ?? getDefaultFlooringCovering(room.type);

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          area: roomInputs[index]?.area ?? 0,
          perimeter: roomGeometries[index]?.perimeter ?? 0,
          coveringType,
          preparationType: flooringDraft.preparationType ?? getDefaultFlooringPreparation(room.type),
          layoutType: flooringDraft.layoutType ?? getDefaultFlooringLayout(coveringType),
          isIncluded: flooringDraft.isIncluded ?? true,
        };
      }),
    [flooringRooms, roomGeometries, roomInputs, rooms],
  );
  const flooringResult = useMemo(
    () =>
      calculateFlooring(flooringRoomInputs, {
        includePlinth: flooringOptions.includePlinth,
        plinthType: flooringOptions.plinthType,
        includeThresholds: flooringOptions.includeThresholds,
        thresholdCount: parseEstimateDecimal(flooringOptions.thresholdCount),
        includeDemolition: flooringOptions.includeDemolition,
      }),
    [flooringOptions, flooringRoomInputs],
  );
  const estimateResult = useMemo(() => {
    const sections = [
      ...(warmFloorResult.selectedArea > 0 ? [warmFloorResult.section] : []),
      ...(flooringResult.flooringArea > 0 ? [flooringResult.section] : []),
    ];

    return {
      sections,
      totals: calculateEstimateTotals(sections, totals.floorArea),
    };
  }, [flooringResult, totals.floorArea, warmFloorResult]);

  const summaryItems = [
    { label: "Площадь пола", value: formatMeasurement(totals.floorArea, "м²") },
    { label: "Периметр", value: formatMeasurement(totals.perimeter, "м") },
    { label: "Стены всего", value: formatMeasurement(totals.wallArea, "м²") },
    { label: "Проёмы", value: formatMeasurement(totals.openingArea, "м²") },
    { label: "Стены к отделке", value: formatMeasurement(totals.finishWallArea, "м²") },
    { label: "Потолки", value: formatMeasurement(totals.ceilingArea, "м²") },
    { label: "Плинтус", value: formatMeasurement(totals.plinthLength, "м") },
  ];
  const estimateTotalItems = [
    { label: "Работы", value: formatMoney(estimateResult.totals.works) },
    { label: "Материалы", value: formatMoney(estimateResult.totals.materials) },
    { label: "Оборудование", value: formatMoney(estimateResult.totals.equipment) },
    { label: "Расходники", value: formatMoney(estimateResult.totals.consumables) },
    { label: "Итого", value: formatMoney(estimateResult.totals.total), isStrong: true },
    { label: "₽/м²", value: `${formatMoney(estimateResult.totals.pricePerSquareMeter)}/м²` },
  ];
  const warmFloorModeLabel = warmFloorMode === "water" ? "Водяной" : "Электрический";
  const warmFloorConnectionLabel =
    warmFloorMode === "electric"
      ? "автомат в щит"
      : warmFloorResult.usesTowelRailConnection
        ? "от полотенцесушителя"
        : warmFloorResult.needsPump
          ? "гребенка + насос"
          : warmFloorResult.needsManifold
            ? "гребенка"
            : "без отдельного узла";
  const warmFloorSummaryItems =
    warmFloorMode === "water"
      ? [
          { label: "Площадь", value: formatMeasurement(warmFloorResult.selectedArea, "м²") },
          { label: "Штроба", value: formatMeasurement(warmFloorResult.chaseLengthMeters, "м.п.") },
          { label: "Труба", value: formatMeasurement(warmFloorResult.pipeMeters, "м") },
          { label: "Контуры", value: `${warmFloorResult.circuitCount} шт.` },
          { label: "Работы", value: formatMoney(warmFloorResult.worksTotal) },
          { label: "Материалы", value: formatMoney(warmFloorResult.materialsTotal) },
          { label: "Итого", value: formatMoney(warmFloorResult.total), isStrong: true },
        ]
      : [
          { label: "Площадь", value: formatMeasurement(warmFloorResult.selectedArea, "м²") },
          { label: "Штроба", value: formatMeasurement(warmFloorResult.chaseLengthMeters, "м.п.") },
          { label: "Терморегулятор", value: `${warmFloorResult.thermostatCount} шт.` },
          { label: "Автомат в щит", value: `${warmFloorResult.electricBreakerCount} шт.` },
          { label: "Работы", value: formatMoney(warmFloorResult.worksTotal) },
          { label: "Материалы", value: formatMoney(warmFloorResult.materialsTotal) },
          { label: "Итого", value: formatMoney(warmFloorResult.total), isStrong: true },
      ];
  const flooringSummaryItems = [
    { label: "Площадь пола", value: formatMeasurement(flooringResult.flooringArea, "м²") },
    { label: "Площадь закупки", value: formatMeasurement(flooringResult.purchaseArea, "м²") },
    { label: "Плинтус", value: formatMeasurement(flooringResult.plinthLength, "м") },
    { label: "Работы", value: formatMoney(flooringResult.worksTotal) },
    { label: "Материалы", value: formatMoney(flooringResult.materialsTotal) },
    { label: "Расходники", value: formatMoney(flooringResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(flooringResult.total), isStrong: true },
  ];
  const flooringSpecItems = flooringResult.section.items;
  const isFlooringSpecLong = flooringSpecItems.length > FLOORING_SPEC_COLLAPSED_LIMIT;
  const visibleFlooringSpecItems =
    isFlooringSpecLong && !isFlooringSpecExpanded
      ? flooringSpecItems.slice(0, FLOORING_SPEC_COLLAPSED_LIMIT)
      : flooringSpecItems;
  const hiddenFlooringSpecCount = Math.max(0, flooringSpecItems.length - visibleFlooringSpecItems.length);

  function updateRoom(roomId: string, patch: Partial<EstimateRoomDraft>) {
    setRooms((currentRooms) => currentRooms.map((room) => (room.id === roomId ? { ...room, ...patch } : room)));
  }

  function updateWarmFloorRoom(roomId: string, patch: WarmFloorRoomDraft) {
    setWarmFloorRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateFlooringRoom(roomId: string, patch: FlooringRoomDraft) {
    setFlooringRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }

  function updateFlooringCovering(roomId: string, coveringType: FlooringCoveringType) {
    updateFlooringRoom(roomId, {
      coveringType,
      layoutType: getDefaultFlooringLayout(coveringType),
    });
  }

  function updateFlooringOptions(patch: Partial<FlooringOptionsDraft>) {
    setFlooringOptions((currentOptions) => ({
      ...currentOptions,
      ...patch,
    }));
  }

  function addRoom() {
    setRooms((currentRooms) => [...currentRooms, createEstimateRoom()]);
  }

  function removeRoom(roomId: string) {
    setRooms((currentRooms) => (currentRooms.length > 1 ? currentRooms.filter((room) => room.id !== roomId) : currentRooms));
    setWarmFloorRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
    setFlooringRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
  }

  return (
    <main className="public-landing public-estimate-page">
      <header className="public-estimate-header">
        <a className="public-brand public-privacy-brand" href="/" aria-label="Danko, на главную">
          <img className="public-brand-mark" src="/brand/danko-logo-mark.png" alt="" aria-hidden="true" />
          <span className="public-brand-copy">
            <span className="public-brand-name">Danko</span>
            <span className="public-brand-subtitle">дизайн / отделка / комплектация</span>
          </span>
        </a>
        <a className="public-privacy-back" href="/">
          Вернуться на главную
        </a>
      </header>

      <section className="public-estimate" aria-labelledby="public-estimate-title">
        <div className="public-estimate-card public-estimate-card-main">
          <div className="public-estimate-intro">
            <p className="public-section-kicker">Калькулятор ремонта</p>
            <h1 id="public-estimate-title">Расчёт стоимости ремонта</h1>
            <p className="public-estimate-subtitle">
              Первый блок считает геометрию объекта по площадям помещений: пол, периметр, стены, проёмы, потолки и
              плинтус.
            </p>
          </div>

          <section className="public-estimate-summary" aria-labelledby="public-estimate-summary-title">
            <div className="public-estimate-summary-head">
              <p className="public-section-kicker">Объём объекта</p>
              <h2 id="public-estimate-summary-title">Предварительная геометрия</h2>
            </div>

            <div className="public-estimate-summary-grid">
              {summaryItems.map((item) => (
                <div className="public-estimate-summary-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="public-estimate-geometry" aria-labelledby="public-estimate-geometry-title">
            <div className="public-estimate-geometry-head">
              <div>
                <span>Шаг 01</span>
                <h2 id="public-estimate-geometry-title">Объект и помещения</h2>
              </div>

              <label className="public-estimate-field public-estimate-ceiling-field">
                <span>Высота потолков, м</span>
                <input
                  className="public-estimate-input"
                  inputMode="decimal"
                  value={ceilingHeightInput}
                  onChange={(event) => setCeilingHeightInput(event.target.value)}
                />
              </label>
            </div>

            <div className="public-estimate-room-header" aria-hidden="true">
              <span>№</span>
              <span>Помещение</span>
              <span>Тип</span>
              <span>Площадь</span>
              <span>Двери</span>
              <span>Окна</span>
              <span>Стены к отделке</span>
              <span />
            </div>

            <div className="public-estimate-room-list" aria-label="Список помещений">
              {roomGeometries.map((room, index) => {
                const roomDraft = rooms[index];

                return (
                  <article className="public-estimate-room-row" key={room.id}>
                    <div className="public-estimate-room-top">
                      <div className="public-estimate-room-index" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <label className="public-estimate-field public-estimate-room-name">
                        <span className="public-estimate-mobile-label">Помещение</span>
                        <input
                          aria-label="Помещение"
                          className="public-estimate-input"
                          value={roomDraft.name}
                          onChange={(event) => updateRoom(room.id, { name: event.target.value })}
                        />
                      </label>

                      <button
                        aria-label="Удалить помещение"
                        className="public-estimate-row-remove"
                        type="button"
                        disabled={rooms.length <= 1}
                        onClick={() => removeRoom(room.id)}
                      >
                        ×
                      </button>
                    </div>

                    <div className="public-estimate-room-main">
                      <label className="public-estimate-field public-estimate-room-type">
                        <span className="public-estimate-mobile-label">Тип</span>
                        <select
                          aria-label="Тип помещения"
                          className="public-estimate-select"
                          value={roomDraft.type}
                          onChange={(event) => updateRoom(room.id, { type: event.target.value as EstimateRoomType })}
                        >
                          {roomTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="public-estimate-room-metrics">
                        <label className="public-estimate-field public-estimate-room-area">
                          <span className="public-estimate-mobile-label">Площадь</span>
                          <input
                            aria-label="Площадь помещения"
                            className="public-estimate-input"
                            inputMode="decimal"
                            value={roomDraft.area}
                            onChange={(event) => updateRoom(room.id, { area: event.target.value })}
                          />
                        </label>

                        <label className="public-estimate-field public-estimate-room-doors">
                          <span className="public-estimate-mobile-label">Двери</span>
                          <input
                            aria-label="Количество дверей"
                            className="public-estimate-input"
                            inputMode="numeric"
                            value={roomDraft.doorCount}
                            onChange={(event) => updateRoom(room.id, { doorCount: event.target.value })}
                          />
                        </label>

                        <label className="public-estimate-field public-estimate-room-windows">
                          <span className="public-estimate-mobile-label">Окна</span>
                          <input
                            aria-label="Количество окон"
                            className="public-estimate-input"
                            inputMode="numeric"
                            value={roomDraft.windowCount}
                            onChange={(event) => updateRoom(room.id, { windowCount: event.target.value })}
                          />
                        </label>
                      </div>

                      <div className="public-estimate-room-result">
                        <span className="public-estimate-mobile-label">Стены к отделке</span>
                        <strong>{formatMeasurement(room.finishWallArea, "м²")}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="public-estimate-geometry-footer">
              <button className="public-estimate-small-action" type="button" onClick={addRoom}>
                Добавить помещение
              </button>
              <p>
                Расчёт предварительный: используем площади по БТИ и коэффициент формы, без ручного замера каждой стены.
              </p>
            </div>
          </section>

          <section className="public-estimate-warm-floor" aria-labelledby="public-estimate-warm-floor-title">
            <div className="public-estimate-warm-floor-head">
              <div>
                <span>Шаг 02</span>
                <h2 id="public-estimate-warm-floor-title">Тёплый пол</h2>
                <p>Выберите помещения, площадь зоны и тип системы. Раздел сразу попадает в итоговую смету.</p>
              </div>

              <div className="public-estimate-toggle-group" aria-label="Тип тёплого пола">
                <button
                  className={warmFloorMode === "water" ? "public-estimate-toggle-active" : undefined}
                  type="button"
                  aria-pressed={warmFloorMode === "water"}
                  onClick={() => setWarmFloorMode("water")}
                >
                  Водяной
                </button>
                <button
                  className={warmFloorMode === "electric" ? "public-estimate-toggle-active" : undefined}
                  type="button"
                  aria-pressed={warmFloorMode === "electric"}
                  onClick={() => setWarmFloorMode("electric")}
                >
                  Электрический
                </button>
              </div>
            </div>

            <div className="public-estimate-room-toggle-list" aria-label="Помещения для тёплого пола">
              {rooms.map((room, index) => {
                const warmFloorDraft = warmFloorRooms[room.id] ?? {};
                const isSelected = warmFloorDraft.isSelected ?? room.type === "bathroom";
                const warmFloorArea = warmFloorDraft.warmFloorArea ?? room.area;
                const normalizedArea = roomInputs[index]?.area ?? 0;

                return (
                  <article className="public-estimate-warm-floor-row" key={room.id}>
                    <label className="public-estimate-warm-floor-room">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => updateWarmFloorRoom(room.id, { isSelected: event.target.checked })}
                      />
                      <span>
                        <strong>{room.name.trim() || "Помещение"}</strong>
                        <small>{formatMeasurement(normalizedArea, "м²")}</small>
                      </span>
                    </label>

                    <label className="public-estimate-field public-estimate-warm-floor-area">
                      <span>Площадь тёплого пола</span>
                      <input
                        className="public-estimate-input"
                        inputMode="decimal"
                        value={warmFloorArea}
                        disabled={!isSelected}
                        onChange={(event) => updateWarmFloorRoom(room.id, { warmFloorArea: event.target.value })}
                      />
                    </label>
                  </article>
                );
              })}
            </div>

            <div className="public-estimate-warm-floor-summary" aria-label="Итоги по тёплому полу">
              {warmFloorSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-warm-floor-total" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {warmFloorResult.section.items.length > 0 ? (
              <div className="public-estimate-warm-floor-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>
                    {warmFloorModeLabel}; подключение: {warmFloorConnectionLabel}
                  </span>
                </div>
                <ul>
                  {warmFloorResult.section.items.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">Выберите хотя бы одно помещение, чтобы добавить тёплый пол в смету.</p>
            )}
          </section>

          <section className="public-estimate-flooring" aria-labelledby="public-estimate-flooring-title">
            <div className="public-estimate-flooring-head">
              <div>
                <span>Шаг 03</span>
                <h2 id="public-estimate-flooring-title">Полы</h2>
                <p>Выберите покрытие, подготовку и способ укладки по помещениям. Плинтус, порожки и демонтаж считаются отдельными строками.</p>
              </div>
            </div>

            <div className="public-estimate-flooring-header" aria-hidden="true">
              <span>Помещение</span>
              <span>Покрытие</span>
              <span>Подготовка</span>
              <span>Укладка</span>
              <span>Закупка</span>
              <span>Итого</span>
            </div>

            <div className="public-estimate-flooring-room-list" aria-label="Помещения для расчёта полов">
              {flooringResult.roomResults.map((room) => {
                const flooringDraft = flooringRooms[room.roomId] ?? {};
                const isIncluded = flooringDraft.isIncluded ?? true;

                return (
                  <article className="public-estimate-flooring-row" key={room.roomId}>
                    <label className="public-estimate-flooring-room">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={(event) => updateFlooringRoom(room.roomId, { isIncluded: event.target.checked })}
                      />
                      <span>
                        <strong>{room.roomName}</strong>
                        <small>{formatMeasurement(room.area, "м²")}</small>
                      </span>
                    </label>

                    <label className="public-estimate-field public-estimate-flooring-covering">
                      <span className="public-estimate-mobile-label">Покрытие</span>
                      <select
                        className="public-estimate-select"
                        value={room.coveringType}
                        disabled={!isIncluded}
                        onChange={(event) => updateFlooringCovering(room.roomId, event.target.value as FlooringCoveringType)}
                      >
                        {flooringCoveringOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="public-estimate-field public-estimate-flooring-preparation">
                      <span className="public-estimate-mobile-label">Подготовка</span>
                      <select
                        className="public-estimate-select"
                        value={room.preparationType}
                        disabled={!isIncluded}
                        onChange={(event) => updateFlooringRoom(room.roomId, { preparationType: event.target.value as FlooringPreparationType })}
                      >
                        {flooringPreparationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="public-estimate-field public-estimate-flooring-layout">
                      <span className="public-estimate-mobile-label">Укладка</span>
                      <select
                        className="public-estimate-select"
                        value={room.layoutType}
                        disabled={!isIncluded}
                        onChange={(event) => updateFlooringRoom(room.roomId, { layoutType: event.target.value as FlooringLayoutType })}
                      >
                        {flooringLayoutOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="public-estimate-flooring-result">
                      <span className="public-estimate-mobile-label">Закупка</span>
                      <strong>{formatMeasurement(room.purchaseArea, "м²")}</strong>
                    </div>

                    <div className="public-estimate-flooring-total">
                      <span className="public-estimate-mobile-label">Итого</span>
                      <strong>{formatMoney(room.roomTotal)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="public-estimate-flooring-options">
              <label className="public-estimate-option-check">
                <input
                  type="checkbox"
                  checked={flooringOptions.includePlinth}
                  onChange={(event) => updateFlooringOptions({ includePlinth: event.target.checked })}
                />
                <span>Плинтус</span>
              </label>

              <label className="public-estimate-field">
                <span>Тип плинтуса</span>
                <select
                  className="public-estimate-select"
                  value={flooringOptions.plinthType}
                  disabled={!flooringOptions.includePlinth}
                  onChange={(event) => updateFlooringOptions({ plinthType: event.target.value as FlooringPlinthType })}
                >
                  {flooringPlinthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="public-estimate-option-check">
                <input
                  type="checkbox"
                  checked={flooringOptions.includeThresholds}
                  onChange={(event) => updateFlooringOptions({ includeThresholds: event.target.checked })}
                />
                <span>Порожки</span>
              </label>

              <label className="public-estimate-field">
                <span>Количество</span>
                <input
                  className="public-estimate-input"
                  inputMode="numeric"
                  value={flooringOptions.thresholdCount}
                  disabled={!flooringOptions.includeThresholds}
                  onChange={(event) => updateFlooringOptions({ thresholdCount: event.target.value })}
                />
              </label>

              <label className="public-estimate-option-check">
                <input
                  type="checkbox"
                  checked={flooringOptions.includeDemolition}
                  onChange={(event) => updateFlooringOptions({ includeDemolition: event.target.checked })}
                />
                <span>Демонтаж</span>
              </label>
            </div>

            <div className="public-estimate-flooring-summary" aria-label="Итоги по полам">
              {flooringSummaryItems.map((item) => (
                <div className={item.isStrong ? "public-estimate-flooring-total-cell" : undefined} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {flooringResult.section.items.length > 0 ? (
              <div className="public-estimate-flooring-spec">
                <div className="public-estimate-warm-floor-spec-head">
                  <p>Состав раздела</p>
                  <span>Покрытия, подготовка, плинтус и расходники</span>
                </div>
                <ul>
                  {visibleFlooringSpecItems.map((item) => (
                    <li key={item.id}>
                      <span className="public-estimate-warm-floor-line-title">{item.title}</span>
                      <span className="public-estimate-warm-floor-line-meta">
                        {formatEstimateQuantity(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
                      </span>
                      <strong>{formatMoney(item.total)}</strong>
                    </li>
                  ))}
                </ul>
                {isFlooringSpecLong ? (
                  <button
                    className="public-estimate-spec-toggle"
                    type="button"
                    aria-expanded={isFlooringSpecExpanded}
                    onClick={() => setIsFlooringSpecExpanded((currentValue) => !currentValue)}
                  >
                    {isFlooringSpecExpanded
                      ? "Свернуть спецификацию"
                      : `Показать всю спецификацию${hiddenFlooringSpecCount > 0 ? `: ещё ${hiddenFlooringSpecCount} строк` : ""}`}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="public-estimate-warm-floor-empty">Включите хотя бы одно помещение, чтобы добавить полы в смету.</p>
            )}
          </section>

          <section className="public-estimate-costs" aria-labelledby="public-estimate-costs-title">
            <div className="public-estimate-costs-head">
              <p className="public-section-kicker">Итоговая смета</p>
              <h2 id="public-estimate-costs-title">Стоимость по разделам</h2>
            </div>

            <div className="public-estimate-cost-grid">
              {estimateTotalItems.map((item) => (
                <div className={`public-estimate-cost-cell${item.isStrong ? " public-estimate-cost-cell-total" : ""}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <p className="public-estimate-cost-note">
              Сейчас в смету включены тёплый пол и полы. Следующие разделы подключим отдельно: стены, потолки, электрика и
              сантехника.
            </p>
          </section>

          <div className="public-estimate-actions" aria-label="Действия на странице калькулятора">
            <a className="public-action" href="/#contacts">
              Оставить заявку
            </a>
            <a className="public-hero-secondary" href="/">
              Вернуться на главную
            </a>
          </div>
        </div>

        <aside className="public-estimate-card public-estimate-scenario" aria-label="Будущий сценарий расчёта">
          <div className="public-estimate-preview-head">
            <span>Сценарий</span>
            <h2>Следующие блоки</h2>
          </div>
          <ol className="public-estimate-steps">
            {estimateSteps.map((step, index) => (
              <li className={index === 0 ? "public-estimate-step-active" : undefined} key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}
