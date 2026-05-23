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
    description:
      "Помогаем собрать понятную концепцию ремонта: планировка, материалы, цвета, сценарии освещения и общая логика пространства.",
  },
  {
    title: "Детальный расчёт",
    description:
      "Формируем понятную структуру стоимости по работам, материалам и комплектации, чтобы клиент видел, из чего складывается бюджет.",
  },
  {
    title: "Отделочные работы",
    description:
      "Выполняем черновую и чистовую отделку квартир и апартаментов под ключ, с контролем этапов и качества.",
  },
  {
    title: "Комплектация",
    description:
      "Подбираем, закупаем и доставляем материалы на объект. Снимаем с клиента хаос поставок и постоянных дозакупок.",
  },
  {
    title: "Мебель и техника",
    description:
      "Комплектуем объект кухней, шкафами, техникой и базовыми позициями, если ремонт должен быть готов к проживанию или сдаче.",
  },
  {
    title: "Ведение объекта",
    description:
      "Организуем работы, график, мастеров, поставки и контроль исполнения. Клиент видит процесс, а не тушит пожары.",
  },
];

export function PublicLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

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

          <div className="public-services-grid">
            {publicServiceItems.map((service, index) => (
              <article className="public-service-card" key={service.title}>
                <span className="public-service-number">{String(index + 1).padStart(2, "0")}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
