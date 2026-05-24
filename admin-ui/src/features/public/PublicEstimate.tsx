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

const initialRooms: EstimateRoomInput[] = [
  { id: "hallway", name: "Прихожая", type: "hallway", area: 6.5, doorCount: 1, windowCount: 0 },
  { id: "kitchen", name: "Кухня", type: "kitchen", area: 12, doorCount: 1, windowCount: 1 },
  { id: "living-room", name: "Комната", type: "living_room", area: 18, doorCount: 1, windowCount: 1 },
  { id: "bathroom", name: "Санузел", type: "bathroom", area: 4.3, doorCount: 1, windowCount: 0 },
  { id: "balcony", name: "Балкон", type: "balcony", area: 2.2, doorCount: 1, windowCount: 1 },
];

function formatInputValue(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatMeasurement(value: number, unit: "м" | "м²") {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)} ${unit}`;
}

function createEstimateRoom(): EstimateRoomInput {
  return {
    id: `room-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: "Новое помещение",
    type: "other",
    area: 10,
    doorCount: 1,
    windowCount: 0,
  };
}

export function PublicEstimate() {
  const [ceilingHeight, setCeilingHeight] = useState(2.7);
  const [rooms, setRooms] = useState<EstimateRoomInput[]>(initialRooms);

  const roomGeometries = useMemo(
    () => rooms.map((room) => calculateEstimateRoomGeometry(room, ceilingHeight)),
    [rooms, ceilingHeight],
  );
  const totals = useMemo(() => calculateEstimateGeometryTotals(roomGeometries), [roomGeometries]);

  const summaryItems = [
    { label: "Площадь пола", value: formatMeasurement(totals.floorArea, "м²") },
    { label: "Расчётный периметр", value: formatMeasurement(totals.perimeter, "м") },
    { label: "Стены всего", value: formatMeasurement(totals.wallArea, "м²") },
    { label: "Проёмы", value: formatMeasurement(totals.openingArea, "м²") },
    { label: "Стены к отделке", value: formatMeasurement(totals.finishWallArea, "м²") },
    { label: "Потолки", value: formatMeasurement(totals.ceilingArea, "м²") },
    { label: "Плинтус / периметр", value: formatMeasurement(totals.plinthLength, "м") },
  ];

  function updateRoom(roomId: string, patch: Partial<EstimateRoomInput>) {
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
          <p className="public-section-kicker">Калькулятор ремонта</p>
          <h1 id="public-estimate-title">Расчёт стоимости ремонта</h1>
          <p className="public-estimate-subtitle">
            Введите параметры объекта и получите предварительную смету по работам, материалам и комплектации.
          </p>
          <p className="public-estimate-description">
            Калькулятор будет считать ремонт по логике Danko: площади помещений, стены, полы, тёплый пол,
            потолки, электрика, сантехника и итоговая смета.
          </p>

          <section className="public-estimate-geometry" aria-labelledby="public-estimate-geometry-title">
            <div className="public-estimate-geometry-head">
              <div>
                <span>Шаг 01</span>
                <h2 id="public-estimate-geometry-title">Объект и помещения</h2>
                <p>Введите помещения по БТИ. Мы рассчитаем базовую геометрию без ручного замера каждой стены.</p>
              </div>

              <label className="public-estimate-field public-estimate-ceiling-field">
                <span>Высота потолков, м</span>
                <input
                  className="public-estimate-input"
                  inputMode="decimal"
                  value={formatInputValue(ceilingHeight)}
                  onChange={(event) => setCeilingHeight(parseEstimateDecimal(event.target.value))}
                />
              </label>
            </div>

            <div className="public-estimate-room-list" aria-label="Список помещений">
              {roomGeometries.map((room, index) => (
                <article className="public-estimate-room-row" key={room.id}>
                  <div className="public-estimate-room-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <label className="public-estimate-field public-estimate-room-name">
                    <span>Помещение</span>
                    <input
                      className="public-estimate-input"
                      value={room.name}
                      onChange={(event) => updateRoom(room.id, { name: event.target.value })}
                    />
                  </label>

                  <label className="public-estimate-field">
                    <span>Тип</span>
                    <select
                      className="public-estimate-select"
                      value={room.type}
                      onChange={(event) => updateRoom(room.id, { type: event.target.value as EstimateRoomType })}
                    >
                      {roomTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="public-estimate-field">
                    <span>Площадь</span>
                    <input
                      className="public-estimate-input"
                      inputMode="decimal"
                      value={formatInputValue(room.area)}
                      onChange={(event) => updateRoom(room.id, { area: parseEstimateDecimal(event.target.value) })}
                    />
                  </label>

                  <label className="public-estimate-field">
                    <span>Двери</span>
                    <input
                      className="public-estimate-input"
                      inputMode="numeric"
                      value={formatInputValue(room.doorCount)}
                      onChange={(event) => updateRoom(room.id, { doorCount: parseEstimateDecimal(event.target.value) })}
                    />
                  </label>

                  <label className="public-estimate-field">
                    <span>Окна</span>
                    <input
                      className="public-estimate-input"
                      inputMode="numeric"
                      value={formatInputValue(room.windowCount)}
                      onChange={(event) => updateRoom(room.id, { windowCount: parseEstimateDecimal(event.target.value) })}
                    />
                  </label>

                  <div className="public-estimate-room-result">
                    <span>Стены к отделке</span>
                    <strong>{formatMeasurement(room.finishWallArea, "м²")}</strong>
                  </div>

                  <button
                    className="public-estimate-small-action public-estimate-small-action-muted"
                    type="button"
                    disabled={rooms.length <= 1}
                    onClick={() => removeRoom(room.id)}
                  >
                    Удалить
                  </button>
                </article>
              ))}
            </div>

            <button className="public-estimate-small-action" type="button" onClick={addRoom}>
              Добавить помещение
            </button>
          </section>

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

            <p className="public-estimate-summary-note">
              Расчёт предварительный. Для публичной версии используем площади помещений по БТИ и расчётный коэффициент
              формы.
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

        <aside className="public-estimate-card" aria-label="Будущий сценарий расчёта">
          <div className="public-estimate-preview-head">
            <span>Сценарий</span>
            <h2>Как будет устроен расчёт</h2>
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
