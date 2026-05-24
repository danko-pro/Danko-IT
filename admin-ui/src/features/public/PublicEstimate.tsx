import { useMemo, useState } from "react";
import {
  calculateEstimateGeometryTotals,
  calculateEstimateRoomGeometry,
  parseEstimateDecimal,
  type EstimateRoomInput,
  type EstimateRoomType,
} from "./public-estimate-geometry";

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

type EstimateRoomDraft = Omit<EstimateRoomInput, "area" | "doorCount" | "windowCount"> & {
  area: string;
  doorCount: string;
  windowCount: string;
};

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

function formatMeasurement(value: number, unit: "м" | "м²") {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)} ${unit}`;
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

export function PublicEstimate() {
  const [ceilingHeightInput, setCeilingHeightInput] = useState("2.7");
  const [rooms, setRooms] = useState<EstimateRoomDraft[]>(initialRooms);

  const ceilingHeight = useMemo(() => parseEstimateDecimal(ceilingHeightInput), [ceilingHeightInput]);
  const roomInputs = useMemo(() => rooms.map(normalizeRoom), [rooms]);
  const roomGeometries = useMemo(
    () => roomInputs.map((room) => calculateEstimateRoomGeometry(room, ceilingHeight)),
    [roomInputs, ceilingHeight],
  );
  const totals = useMemo(() => calculateEstimateGeometryTotals(roomGeometries), [roomGeometries]);

  const summaryItems = [
    { label: "Площадь пола", value: formatMeasurement(totals.floorArea, "м²") },
    { label: "Периметр", value: formatMeasurement(totals.perimeter, "м") },
    { label: "Стены всего", value: formatMeasurement(totals.wallArea, "м²") },
    { label: "Проёмы", value: formatMeasurement(totals.openingArea, "м²") },
    { label: "Стены к отделке", value: formatMeasurement(totals.finishWallArea, "м²") },
    { label: "Потолки", value: formatMeasurement(totals.ceilingArea, "м²") },
    { label: "Плинтус", value: formatMeasurement(totals.plinthLength, "м") },
  ];

  function updateRoom(roomId: string, patch: Partial<EstimateRoomDraft>) {
    setRooms((currentRooms) => currentRooms.map((room) => (room.id === roomId ? { ...room, ...patch } : room)));
  }

  function addRoom() {
    setRooms((currentRooms) => [...currentRooms, createEstimateRoom()]);
  }

  function removeRoom(roomId: string) {
    setRooms((currentRooms) => (currentRooms.length > 1 ? currentRooms.filter((room) => room.id !== roomId) : currentRooms));
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
