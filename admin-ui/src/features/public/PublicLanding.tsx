import { useEffect, useState } from "react";

const publicNavItems = [
  { label: "Услуги", href: "#services" },
  { label: "Объекты", href: "#projects" },
  { label: "Как работаем", href: "#process" },
  { label: "Контакты", href: "#contacts" },
];

const publicHeroFacts = [
  "17+ лет в ремонтах",
  "Детальный расчёт ремонта",
  "Материалы и комплектация",
  "Калининград и область",
];

const publicObjectSteps = [
  { label: "Черновые работы", status: "завершено", state: "done" },
  { label: "Электрика", status: "завершено", state: "done" },
  { label: "Плитка", status: "в работе", state: "active" },
  { label: "Потолки", status: "следующий этап", state: "next" },
];

const publicServiceItems = [
  {
    title: "Дизайн-решение",
    description: "Собираем понятную концепцию ремонта до начала работ.",
    includes: ["планировка и сценарии помещений", "материалы, цвета и покрытия", "логика света и оснащения"],
    result: "понятное направление ремонта без хаотичных решений.",
  },
  {
    title: "Детальный расчёт",
    description: "Формируем структуру стоимости по работам, материалам и комплектации.",
    includes: ["состав работ", "материалы и расходники", "комплектация объекта"],
    result: "клиент видит, из чего складывается бюджет.",
  },
  {
    title: "Отделочные работы",
    description: "Выполняем черновую и чистовую отделку квартир и апартаментов под ключ.",
    includes: ["подготовка оснований", "чистовая отделка", "контроль этапов и качества"],
    result: "объект движется по понятному плану работ.",
  },
  {
    title: "Комплектация",
    description: "Подбираем, закупаем и доставляем материалы на объект.",
    includes: ["подбор материалов", "закупка и поставки", "контроль дозакупок"],
    result: "меньше срывов из-за отсутствующих материалов.",
  },
  {
    title: "Мебель и техника",
    description: "Комплектуем объект базовыми позициями для проживания, сдачи или продажи.",
    includes: ["кухни и шкафы", "техника", "базовое оснащение"],
    result: "ремонт можно довести до готового состояния.",
  },
  {
    title: "Ведение объекта",
    description: "Организуем работы, график, мастеров, поставки и контроль исполнения.",
    includes: ["график работ", "координация мастеров", "контроль этапов"],
    result: "клиент видит процесс, а не тушит пожары.",
  },
];

export function PublicLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);
  const activeService = publicServiceItems[activeServiceIndex];

  useEffect(() => {
    if (isMenuOpen) {
      setIsHeaderHidden(false);
      return;
    }

    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateHeaderVisibility = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 80) {
        setIsHeaderHidden(false);
      } else if (currentScrollY > lastScrollY + 6) {
        setIsHeaderHidden(true);
      } else if (currentScrollY < lastScrollY - 6) {
        setIsHeaderHidden(false);
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(updateHeaderVisibility);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="public-landing">
      <header className={`public-header-shell${isHeaderHidden ? " public-header-shell-hidden" : ""}`}>
        <div className="public-header">
          <a className="public-brand" href="/" aria-label="Danko - главная">
            <img
              className="public-brand-mark"
              src="/brand/danko-logo-mark.png"
              alt=""
              aria-hidden="true"
            />
            <span className="public-brand-copy">
              <span className="public-brand-name">Danko</span>
              <span className="public-brand-subtitle">дизайн / отделка / комплектация</span>
            </span>
          </a>

          <nav
            className={`public-nav${isMenuOpen ? " public-nav-open" : ""}`}
            aria-label="Навигация публичного сайта"
          >
            {publicNavItems.map((item) => (
              <a key={item.href} href={item.href} onClick={closeMenu}>
                {item.label}
              </a>
            ))}
            <a className="public-action public-action-mobile" href="#contacts" onClick={closeMenu}>
              Рассчитать стоимость
            </a>
          </nav>

          <a className="public-action public-action-desktop" href="#contacts">
            Рассчитать стоимость
          </a>

          <button
            className="public-menu-button"
            type="button"
            aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="public-main">
        <section className="public-hero" aria-labelledby="public-hero-title">
          <div className="public-hero-content">
            <p className="public-hero-kicker">Danko · дизайн / отделка / комплектация</p>
            <h1 id="public-hero-title">
              Ремонт квартир и апартаментов под ключ в Калининграде
            </h1>
            <p className="public-hero-description">
              От идеи и расчёта до отделки, комплектации и сдачи объекта. Работаем с квартирами,
              апартаментами и инвесторскими проектами.
            </p>

            <div className="public-hero-actions" aria-label="Основные действия">
              <a className="public-action public-hero-primary" href="#contacts">
                Рассчитать стоимость
              </a>
              <a className="public-hero-secondary" href="#projects">
                Посмотреть объекты
              </a>
            </div>

            <ul className="public-hero-facts" aria-label="Факты о работе Danko">
              {publicHeroFacts.map((fact) => (
                <li className="public-hero-fact" key={fact}>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="public-object-card" aria-label="Пример объекта в работе">
            <div className="public-object-card-header">
              <div>
                <p className="public-object-eyebrow">Объект в работе</p>
                <h2>АГ / 82</h2>
              </div>
              <span className="public-object-status">в работе</span>
            </div>

            <div className="public-object-summary">
              <span>Апартаменты</span>
              <span>Этап: чистовая отделка</span>
              <span>Статус: в работе</span>
            </div>

            <ol className="public-object-steps" aria-label="Этапы объекта">
              {publicObjectSteps.map((step) => (
                <li className={`public-object-step public-object-step-${step.state}`} key={step.label}>
                  <span className="public-object-step-dot" aria-hidden="true" />
                  <span className="public-object-step-label">{step.label}</span>
                  <span className="public-object-step-status">{step.status}</span>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section className="public-services" id="services" aria-labelledby="public-services-title">
          <div className="public-section-heading">
            <p className="public-section-kicker">Услуги</p>
            <h2 id="public-services-title">Что берём на себя</h2>
            <p>
              Закрываем ремонт как единый процесс: от идеи и расчёта до отделки, комплектации и
              сдачи объекта.
            </p>
          </div>

          <div className="public-services-explorer">
            <div className="public-services-tabs" role="tablist" aria-label="Услуги Danko">
              {publicServiceItems.map((service, index) => {
                const serviceNumber = String(index + 1).padStart(2, "0");
                const isActive = activeServiceIndex === index;

                return (
                  <button
                    className={`public-service-tab${isActive ? " public-service-tab-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="public-service-panel"
                    id={`public-service-tab-${index}`}
                    key={service.title}
                    onClick={() => setActiveServiceIndex(index)}
                  >
                    <span className="public-service-number">{serviceNumber}</span>
                    <span className="public-service-tab-copy">
                      <span className="public-service-tab-title">{service.title}</span>
                      <span className="public-service-tab-description">{service.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <article
              className="public-service-detail"
              role="tabpanel"
              id="public-service-panel"
              aria-labelledby={`public-service-tab-${activeServiceIndex}`}
            >
              <div className="public-service-detail-header">
                <span className="public-service-number">{String(activeServiceIndex + 1).padStart(2, "0")}</span>
                <h3>{activeService.title}</h3>
                <p>{activeService.description}</p>
              </div>

              <div className="public-service-detail-body">
                <div>
                  <h4>Что входит</h4>
                  <ul>
                    {activeService.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="public-service-result">
                  <h4>Результат</h4>
                  <p>{activeService.result}</p>
                </div>
              </div>
            </article>
          </div>

          <div className="public-services-accordion">
            {publicServiceItems.map((service, index) => {
              const serviceNumber = String(index + 1).padStart(2, "0");
              const isActive = activeServiceIndex === index;

              return (
                <div className="public-service-accordion-item" key={service.title}>
                  <button
                    className={`public-service-accordion-button${
                      isActive ? " public-service-accordion-button-active" : ""
                    }`}
                    type="button"
                    aria-expanded={isActive}
                    aria-controls={`public-service-accordion-panel-${index}`}
                    onClick={() => setActiveServiceIndex(index)}
                  >
                    <span className="public-service-number">{serviceNumber}</span>
                    <span>{service.title}</span>
                  </button>

                  <div
                    className="public-service-accordion-panel"
                    id={`public-service-accordion-panel-${index}`}
                    hidden={!isActive}
                  >
                    <p>{service.description}</p>
                    <h4>Что входит</h4>
                    <ul>
                      {service.includes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <div className="public-service-result">
                      <h4>Результат</h4>
                      <p>{service.result}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
