import { useEffect, useRef, useState } from "react";

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
    visualTitle: "Логика пространства",
    visualItems: ["планировка", "материалы", "сценарии света"],
  },
  {
    title: "Детальный расчёт",
    description: "Формируем структуру стоимости по работам, материалам и комплектации.",
    includes: ["состав работ", "материалы и расходники", "комплектация объекта"],
    result: "клиент видит, из чего складывается бюджет.",
    visualTitle: "Структура бюджета",
    visualItems: ["работы", "материалы", "комплектация"],
  },
  {
    title: "Отделочные работы",
    description: "Выполняем черновую и чистовую отделку квартир и апартаментов под ключ.",
    includes: ["подготовка оснований", "чистовая отделка", "контроль этапов и качества"],
    result: "объект движется по понятному плану работ.",
    visualTitle: "Ход работ",
    visualItems: ["подготовка", "чистовая отделка", "контроль"],
  },
  {
    title: "Комплектация",
    description: "Подбираем, закупаем и доставляем материалы на объект.",
    includes: ["подбор материалов", "закупка и поставки", "контроль дозакупок"],
    result: "меньше срывов из-за отсутствующих материалов.",
    visualTitle: "Поставка на объект",
    visualItems: ["подбор", "закупка", "доставка"],
  },
  {
    title: "Мебель и техника",
    description: "Комплектуем объект базовыми позициями для проживания, сдачи или продажи.",
    includes: ["кухни и шкафы", "техника", "базовое оснащение"],
    result: "ремонт можно довести до готового состояния.",
    visualTitle: "Готовность объекта",
    visualItems: ["кухня", "шкафы", "техника"],
  },
  {
    title: "Ведение объекта",
    description: "Организуем работы, график, мастеров, поставки и контроль исполнения.",
    includes: ["график работ", "координация мастеров", "контроль этапов"],
    result: "клиент видит процесс, а не тушит пожары.",
    visualTitle: "Управление процессом",
    visualItems: ["график", "мастера", "контроль"],
  },
];

const publicRepairPackages = [
  {
    name: "Пакет C",
    subtitle: "Практичный ремонт",
    price: "от 40 000 ₽/м²",
    exactPrice: "40 228 ₽/м²",
    totalExample: "от 2,57 млн ₽ за 63,9 м²",
    description: "Базовый формат для квартиры под сдачу, продажу или аккуратный запуск объекта.",
    isFeatured: true,
    badge: "Актуальный выбор",
    metric: "10+ расчётов в год",
    note: "Часто подходит для квартир под сдачу, продажу и быстрого запуска объекта.",
    items: [
      "Работы + материалы — 24 537 ₽/м²",
      "Мебель — 9 587 ₽/м²",
      "Техника — 2 854 ₽/м²",
      "Логистика и техрасходы — 2 750 ₽/м²",
      "Уборка — 500 ₽/м²",
    ],
  },
  {
    name: "Пакет B",
    subtitle: "Сбалансированный под ключ",
    price: "от 52 000 ₽/м²",
    exactPrice: "52 280 ₽/м²",
    totalExample: "от 3,34 млн ₽ за 63,9 м²",
    description: "Средний формат ремонта под ключ с более плотной комплектацией.",
    items: [
      "Работы + материалы — 35 759 ₽/м²",
      "Мебель — 9 274 ₽/м²",
      "Техника — 3 997 ₽/м²",
      "Логистика и техрасходы — 2 750 ₽/м²",
      "Уборка — 500 ₽/м²",
    ],
  },
  {
    name: "Пакет A",
    subtitle: "Расширенный под ключ",
    price: "от 75 000 ₽/м²",
    exactPrice: "75 416 ₽/м²",
    totalExample: "от 4,82 млн ₽ за 63,9 м²",
    description: "Расширенный формат с более высокой долей отделки, мебели и комплектации.",
    items: [
      "Работы + материалы — 50 011 ₽/м²",
      "Мебель — 17 850 ₽/м²",
      "Техника — 4 306 ₽/м²",
      "Логистика и техрасходы — 2 750 ₽/м²",
      "Уборка — 500 ₽/м²",
    ],
  },
];

const publicProjectItems = [
  {
    name: "RE",
    area: "126,0 м²",
    package: "A",
    type: "крупный ремонтный проект",
    focus: ["работы", "материалы", "мебель", "техника"],
  },
  {
    name: "K8",
    area: "45,0 м²",
    package: "B",
    type: "квартира",
    focus: ["работы", "материалы", "мебель", "техника"],
  },
  {
    name: "TK",
    area: "69,0 м²",
    package: "B",
    type: "квартира",
    focus: ["работы", "материалы", "комплектация"],
  },
  {
    name: "ИБ / 22",
    area: "52,0 м²",
    package: "C",
    type: "квартира",
    focus: ["работы", "материалы", "мебель", "техника", "двери"],
  },
  {
    name: "АГ / 82",
    area: "41,5 м²",
    package: "C",
    type: "апартаменты",
    focus: ["отделка", "комплектация", "мебель", "техника"],
  },
  {
    name: "ИБ / 42",
    area: "47,1 м²",
    package: "C",
    type: "квартира",
    focus: ["электрика", "отделка", "комплектация"],
  },
];

const publicProcessCards = [
  {
    title: "Типовой ориентир",
    text: "Типовой срок ремонта под ключ может составлять около 45 рабочих дней, но зависит от площади, состояния объекта, состава работ, выбранных материалов и комплектации.",
  },
  {
    title: "Детальная смета",
    text: "Работы, материалы, мебель, техника, логистика и дополнительные позиции собираются в понятную структуру. AI-обработка помогает быстрее разложить данные по категориям и проверить состав расчёта.",
  },
];

const publicProcessSteps = [
  {
    title: "Заявка и вводные",
    description:
      "Уточняем объект, площадь, состояние, цель ремонта и желаемый формат: под себя, под сдачу, продажу или инвесторский пакет.",
    meta: "1 день",
  },
  {
    title: "Детальная смета и AI-обработка",
    description:
      "Собираем смету по работам, материалам, мебели, технике и логистике. Используем AI-обработку данных, чтобы быстрее структурировать позиции, проверить состав и показать клиенту понятный бюджет до старта.",
    meta: "от 1 до 3 дней",
  },
  {
    title: "Состав и комплектация",
    description:
      "Формируем наполнение объекта: отделка, материалы, техника, мебель, двери и дополнительные позиции. Сразу видим, что входит в бюджет и где могут появиться изменения.",
    meta: "по задаче объекта",
  },
  {
    title: "График и запуск",
    description:
      "Разбиваем ремонт на этапы, планируем поставки, мастеров и контрольные точки. Объект запускается не хаотично, а по понятной последовательности.",
    meta: "до старта работ",
  },
  {
    title: "Работы на объекте",
    description:
      "Ведём черновые и чистовые этапы, контролируем качество, сроки и наличие материалов. Работы, материалы и комплектация связаны в один процесс.",
    meta: "по графику",
  },
  {
    title: "Сдача результата",
    description:
      "Проверяем готовность, фиксируем замечания, закрываем финальные позиции и передаём объект в понятном состоянии.",
    meta: "финальный этап",
  },
];

export function PublicLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);
  const [activePackageIndex, setActivePackageIndex] = useState(0);
  const [activeProcessIndex, setActiveProcessIndex] = useState(0);
  const processStepRefs = useRef<Array<HTMLLIElement | null>>([]);
  const activeProcessIndexRef = useRef(0);
  const lastProcessScrollYRef = useRef(0);
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

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function" ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 860px)");
    if (!mediaQuery.matches) {
      return;
    }

    let animationFrameId: number | null = null;
    lastProcessScrollYRef.current = window.scrollY;

    const applyGuardedProcessIndex = (targetIndex: number) => {
      const currentIndex = activeProcessIndexRef.current;
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastProcessScrollYRef.current;
      lastProcessScrollYRef.current = currentScrollY;

      if (targetIndex === currentIndex) {
        return false;
      }

      const direction =
        scrollDelta > 1 ? 1 : scrollDelta < -1 ? -1 : targetIndex > currentIndex ? 1 : -1;

      if ((targetIndex > currentIndex && direction < 0) || (targetIndex < currentIndex && direction > 0)) {
        return false;
      }

      const nextIndex = targetIndex > currentIndex ? currentIndex + 1 : currentIndex - 1;
      activeProcessIndexRef.current = nextIndex;
      setActiveProcessIndex(nextIndex);

      return nextIndex !== targetIndex;
    };

    const updateActiveProcessStep = () => {
      animationFrameId = null;

      let targetIndex = activeProcessIndexRef.current;
      let fallbackIndex: number | null = null;
      let hasActivatedStep = false;
      const activationLine = window.innerHeight * 0.55;
      const scrollBottom = window.scrollY + window.innerHeight;
      const pageBottom = document.documentElement.scrollHeight;

      if (pageBottom - scrollBottom <= 4) {
        if (applyGuardedProcessIndex(publicProcessSteps.length - 1)) {
          requestProcessUpdate();
        }

        return;
      }

      processStepRefs.current.forEach((step, index) => {
        if (!step) {
          return;
        }

        const rect = step.getBoundingClientRect();
        const isVisible = rect.bottom >= 0 && rect.top <= window.innerHeight;

        if (!isVisible) {
          return;
        }

        fallbackIndex = index;

        if (rect.top <= activationLine) {
          targetIndex = index;
          hasActivatedStep = true;
        }
      });

      if (!hasActivatedStep && fallbackIndex !== null) {
        targetIndex = fallbackIndex;
      }

      if (applyGuardedProcessIndex(targetIndex)) {
        requestProcessUpdate();
      }
    };

    const requestProcessUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateActiveProcessStep);
    };

    const observer = new IntersectionObserver(
      () => requestProcessUpdate(),
      {
        root: null,
        rootMargin: "-25% 0px -20% 0px",
        threshold: [0, 0.2, 0.5, 0.8],
      },
    );

    processStepRefs.current.forEach((step) => {
      if (step) {
        observer.observe(step);
      }
    });

    requestProcessUpdate();
    window.addEventListener("scroll", requestProcessUpdate, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestProcessUpdate);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

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
                    onMouseEnter={() => setActiveServiceIndex(index)}
                    onFocus={() => setActiveServiceIndex(index)}
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
              <div className="public-service-detail-content" key={activeService.title}>
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

                <div className="public-service-visual" aria-label={`Схема этапа: ${activeService.visualTitle}`}>
                  <div className="public-service-visual-heading">
                    <span>Схема этапа</span>
                    <strong>{activeService.visualTitle}</strong>
                  </div>
                  <ol className="public-service-visual-list">
                    {activeService.visualItems.map((item, index) => (
                      <li className="public-service-visual-item" key={item}>
                        <span className="public-service-visual-dot">{String(index + 1).padStart(2, "0")}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
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
                    className={`public-service-accordion-panel${
                      isActive ? " public-service-accordion-panel-open" : ""
                    }`}
                    id={`public-service-accordion-panel-${index}`}
                    aria-hidden={!isActive}
                  >
                    <div className="public-service-accordion-panel-inner">
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

                      <div className="public-service-visual" aria-label={`Схема этапа: ${service.visualTitle}`}>
                        <div className="public-service-visual-heading">
                          <span>Схема этапа</span>
                          <strong>{service.visualTitle}</strong>
                        </div>
                        <ol className="public-service-visual-list">
                          {service.visualItems.map((item, itemIndex) => (
                            <li className="public-service-visual-item" key={item}>
                              <span className="public-service-visual-dot">
                                {String(itemIndex + 1).padStart(2, "0")}
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="public-projects" id="projects" aria-labelledby="public-projects-title">
          <div className="public-projects-head">
            <div className="public-section-heading">
              <p className="public-section-kicker">Форматы и стоимость</p>
              <h2 id="public-projects-title">Типы ремонта и ориентиры за м²</h2>
              <p>
                Считаем ремонт по составу работ, материалов, мебели, техники и логистики. Клиент
                заранее видит формат, наполнение и порядок бюджета.
              </p>
            </div>
            <span className="public-projects-badge">A / B / C пакеты</span>
          </div>

          <div className="public-package-grid" aria-label="Пакеты ремонта">
            {publicRepairPackages.map((repairPackage, index) => {
              const isActive = activePackageIndex === index;

              return (
                <article
                  className={`public-package-card${isActive ? " public-package-card-active" : ""}${
                    repairPackage.isFeatured ? " public-package-card-featured" : ""
                  }`}
                  key={repairPackage.name}
                  tabIndex={0}
                  onMouseEnter={() => setActivePackageIndex(index)}
                  onFocus={() => setActivePackageIndex(index)}
                  onClick={() => setActivePackageIndex(index)}
                >
                  <div className="public-package-card-header">
                    <div>
                      <p className="public-package-name">{repairPackage.name}</p>
                      <h3>{repairPackage.subtitle}</h3>
                    </div>
                    <span className="public-package-mark" aria-hidden="true">
                      {repairPackage.name.replace("Пакет ", "")}
                    </span>
                  </div>

                  <p className="public-package-description">{repairPackage.description}</p>

                  <div className="public-package-price-block">
                    <strong>{repairPackage.price}</strong>
                    <span>расчётный ориентир: {repairPackage.exactPrice}</span>
                    <em>{repairPackage.totalExample}</em>
                  </div>

                  {(repairPackage.badge || repairPackage.metric) && (
                    <div className="public-package-highlights" aria-label="Особенности пакета">
                      {repairPackage.badge && <span>{repairPackage.badge}</span>}
                      {repairPackage.metric && <strong>{repairPackage.metric}</strong>}
                    </div>
                  )}

                  {repairPackage.note && <p className="public-package-feature-note">{repairPackage.note}</p>}

                  <ul className="public-package-items">
                    {repairPackage.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <p className="public-package-note">
            Ориентиры приведены для предварительной оценки. Точный расчёт зависит от площади,
            состояния объекта, состава работ, выбранных материалов, мебели и техники.
          </p>

          <div className="public-projects-sample">
            <div className="public-projects-subhead">
              <p className="public-section-kicker">Объекты</p>
              <h3>Объекты в расчёте</h3>
            </div>

            <div className="public-project-card-grid" aria-label="Объекты в расчёте">
              {publicProjectItems.map((project) => (
                <article className="public-project-card" key={project.name}>
                  <div className="public-project-card-topline">
                    <span className="public-project-name">{project.name}</span>
                    <span className="public-project-package">Пакет {project.package}</span>
                  </div>
                  <div className="public-project-meta">
                    <span>{project.area}</span>
                    <span>{project.type}</span>
                  </div>
                  <div className="public-project-tags" aria-label="Состав работ">
                    {project.focus.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="public-process" id="process" aria-labelledby="public-process-title">
          <div className="public-process-layout">
            <div className="public-process-aside">
              <div className="public-process-head public-section-heading">
                <p className="public-section-kicker">Как работаем</p>
                <h2 id="public-process-title">Ведём ремонт как понятный процесс</h2>
                <p>
                  От первой заявки до сдачи объекта: фиксируем вводные, формируем детальную смету,
                  собираем комплектацию, ведём график и контролируем этапы работ.
                </p>
              </div>

              <div className="public-process-cards" aria-label="Ориентиры процесса">
                {publicProcessCards.map((card) => (
                  <article className="public-process-card" key={card.title} tabIndex={0}>
                    <h3 className="public-process-card-title">{card.title}</h3>
                    <p>{card.text}</p>
                  </article>
                ))}
              </div>
            </div>

            <ol className="public-process-timeline" aria-label="Этапы работы">
              {publicProcessSteps.map((step, index) => (
                <li
                  className={`public-process-step${
                    activeProcessIndex === index ? " public-process-step-active" : ""
                  }`}
                  key={step.title}
                  ref={(element) => {
                    processStepRefs.current[index] = element;
                  }}
                  data-process-index={index}
                  tabIndex={0}
                >
                  <span className="public-process-step-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="public-process-step-content">
                    <div className="public-process-step-head">
                      <h3>{step.title}</h3>
                      <span className="public-process-step-meta">{step.meta}</span>
                    </div>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}
