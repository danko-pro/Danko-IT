import { useState, type CSSProperties, type KeyboardEvent } from "react";

const PLATFORM_VIEWS = {
  schedule: {
    label: "Сроки",
    eyebrow: "Этап 4 из 7",
    title: "Чистовая отделка",
    progress: 68,
    summary: "Идём по графику",
    next: "Следующая приёмка — 18 июля",
    rows: [
      ["Подготовка стен", "Готово"],
      ["Плиточные работы", "В работе"],
      ["Монтаж дверей", "Следом"],
    ],
  },
  budget: {
    label: "Смета",
    eyebrow: "Актуально сегодня",
    title: "Бюджет проекта",
    progress: 74,
    summary: "В пределах сметы",
    next: "Резерв не использован",
    rows: [
      ["Работы", "По плану"],
      ["Черновые материалы", "Закрыто"],
      ["Чистовые материалы", "Согласование"],
    ],
  },
  supply: {
    label: "Комплектация",
    eyebrow: "27 позиций",
    title: "Материалы и поставки",
    progress: 83,
    summary: "24 позиции согласованы",
    next: "3 поставки в пути",
    rows: [
      ["Напольные покрытия", "Заказано"],
      ["Сантехника", "В пути"],
      ["Свет и электрика", "Подбор"],
    ],
  },
};

type PlatformView = keyof typeof PLATFORM_VIEWS;

export function PublicPlatformSection() {
  const [activeView, setActiveView] = useState<PlatformView>("schedule");
  const active = PLATFORM_VIEWS[activeView];
  const viewKeys = Object.keys(PLATFORM_VIEWS) as PlatformView[];
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? viewKeys.length - 1 : direction ? (index + direction + viewKeys.length) % viewKeys.length : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const nextView = viewKeys[nextIndex];
    setActiveView(nextView);
    document.getElementById(`dk-platform-tab-${nextView}`)?.focus();
  };

  return (
    <section className="dk-section dk-section--soft dk-control dk-reveal" id="platform" aria-labelledby="dk-platform-title">
      <div className="dk-wrap">
        <div className="dk-control__intro">
          <div>
            <p className="dk-section-kicker">Прозрачный процесс</p>
            <h2 className="dk-section-title" id="dk-platform-title">
              Вы знаете, что происходит с ремонтом
            </h2>
          </div>
          <p className="dk-section-lead">
            Технологии остаются за кадром, но дают главное: актуальные сроки, понятную смету, согласованные решения и фото с объекта в одном месте.
          </p>
        </div>

        <div className="dk-control__layout">
          <div className="dk-control__benefits" aria-label="Что получает заказчик">
            <article>
              <span>01</span>
              <div><h3>Без сюрпризов в смете</h3><p>Изменения появляются только после согласования.</p></div>
            </article>
            <article>
              <span>02</span>
              <div><h3>Понятно, что сделано</h3><p>Этапы, сроки и фотоотчёты всегда под рукой.</p></div>
            </article>
            <article>
              <span>03</span>
              <div><h3>Материалы приезжают вовремя</h3><p>Комплектация связана с графиком работ.</p></div>
            </article>
          </div>

          <div className="dk-control__demo">
            <div className="dk-control__demo-head">
              <div><small>Ваш проект</small><strong>Квартира · 82 м²</strong></div>
              <span><i aria-hidden="true" /> Обновлено сегодня</span>
            </div>

            <div className="dk-control__tabs" role="tablist" aria-label="Разделы проекта">
              {viewKeys.map((key, index) => (
                <button
                  key={key}
                  id={`dk-platform-tab-${key}`}
                  type="button"
                  role="tab"
                  aria-selected={key === activeView}
                  aria-controls="dk-platform-panel"
                  tabIndex={key === activeView ? 0 : -1}
                  className={key === activeView ? "is-active" : ""}
                  onClick={() => setActiveView(key)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  {PLATFORM_VIEWS[key].label}
                </button>
              ))}
            </div>

            <div className="dk-control__summary dk-control__motion" id="dk-platform-panel" role="tabpanel" aria-labelledby={`dk-platform-tab-${activeView}`} key={`summary-${activeView}`}>
              <div>
                <small>{active.eyebrow}</small>
                <h3>{active.title}</h3>
                <strong>{active.summary}</strong>
                <p>{active.next}</p>
              </div>
              <div className="dk-control__progress" style={{ "--progress": `${active.progress}%` } as CSSProperties}>
                <span>{active.progress}%</span>
                <small>выполнено</small>
              </div>
            </div>

            <div className="dk-control__rows dk-control__motion" key={`rows-${activeView}`}>
              {active.rows.map(([title, status]) => (
                <div key={title}><span>{title}</span><strong>{status}</strong></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
