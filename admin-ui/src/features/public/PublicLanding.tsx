import { useEffect, useRef, useState } from "react";

import {
  PROCESS_STEP_SWITCH_DELAY_MS,
  contactMethodOptions,
  contactsListItems,
  objectTypeOptions,
  packageTypeOptions,
  publicHeroFacts,
  publicNavItems,
  publicObjectSteps,
  publicProcessCards,
  publicProcessSteps,
  publicProjectItems,
  publicRepairPackages,
  publicServiceItems,
} from "./public-content";
import { useLeadFormDraft } from "./hooks/useLeadFormDraft";

export function PublicLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);
  const [activePackageIndex, setActivePackageIndex] = useState(0);
  const [activeProcessIndex, setActiveProcessIndex] = useState(-1);
  const processStepRefs = useRef<Array<HTMLLIElement | null>>([]);
  const activeProcessIndexRef = useRef(-1);
  const lastProcessScrollYRef = useRef(0);
  const activeService = publicServiceItems[activeServiceIndex];
  const { leadForm, leadFormStatus, isLeadFormSubmitting, handleLeadFormChange, handleLeadFormSubmit } =
    useLeadFormDraft();

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
    let processSwitchTimerId: number | null = null;
    let queuedProcessIndex = activeProcessIndexRef.current;
    lastProcessScrollYRef.current = window.scrollY;

    const commitQueuedProcessIndex = () => {
      processSwitchTimerId = null;

      const currentIndex = activeProcessIndexRef.current;
      if (queuedProcessIndex === currentIndex) {
        return;
      }

      const nextIndex = queuedProcessIndex > currentIndex ? currentIndex + 1 : currentIndex - 1;
      activeProcessIndexRef.current = nextIndex;
      setActiveProcessIndex(nextIndex);

      if (nextIndex !== queuedProcessIndex) {
        processSwitchTimerId = window.setTimeout(commitQueuedProcessIndex, PROCESS_STEP_SWITCH_DELAY_MS);
      }
    };

    const applyGuardedProcessIndex = (targetIndex: number) => {
      const currentIndex = activeProcessIndexRef.current;
      const safeTargetIndex = Math.max(0, Math.min(publicProcessSteps.length - 1, targetIndex));
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastProcessScrollYRef.current;
      lastProcessScrollYRef.current = currentScrollY;

      if (safeTargetIndex === currentIndex) {
        queuedProcessIndex = currentIndex;
        return false;
      }

      const direction =
        scrollDelta > 1 ? 1 : scrollDelta < -1 ? -1 : safeTargetIndex > currentIndex ? 1 : -1;

      if ((safeTargetIndex > currentIndex && direction < 0) || (safeTargetIndex < currentIndex && direction > 0)) {
        return false;
      }

      queuedProcessIndex = safeTargetIndex;

      if (processSwitchTimerId === null) {
        processSwitchTimerId = window.setTimeout(commitQueuedProcessIndex, PROCESS_STEP_SWITCH_DELAY_MS);
      }

      return false;
    };

    const updateActiveProcessStep = () => {
      animationFrameId = null;

      let targetIndex = activeProcessIndexRef.current;
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

        if (rect.top <= activationLine) {
          targetIndex = index;
          hasActivatedStep = true;
        }
      });

      if (hasActivatedStep && applyGuardedProcessIndex(targetIndex)) {
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

      if (processSwitchTimerId !== null) {
        window.clearTimeout(processSwitchTimerId);
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
            <a className="public-action public-action-mobile" href="/estimate" onClick={closeMenu}>
              Рассчитать стоимость
            </a>
          </nav>

          <a className="public-action public-action-desktop" href="/estimate">
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
              <a className="public-action public-hero-primary" href="/estimate">
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

        <section className="public-contacts" id="contacts" aria-labelledby="public-contacts-title">
          <div className="public-section-heading public-contacts-head">
            <p className="public-section-kicker">Контакты</p>
            <h2 id="public-contacts-title">Оставьте вводные по объекту</h2>
            <p>
              Заполните короткую форму: тип объекта, площадь, формат ремонта и комментарий.
              Форма уже отправляет вводные в backend. Следующим этапом подключим уведомление
              менеджеру в Telegram.
            </p>
          </div>

          <div className="public-contacts-layout">
            <div className="public-contacts-panel">
              <form className="public-lead-form" onSubmit={handleLeadFormSubmit}>
                <label className="public-form-honeypot" htmlFor="public-lead-website" aria-hidden="true">
                  <span>Website</span>
                  <input
                    id="public-lead-website"
                    name="website"
                    type="text"
                    value={leadForm.website}
                    onChange={handleLeadFormChange}
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </label>

                <div className="public-form-grid">
                  <label className="public-form-field" htmlFor="public-lead-name">
                    <span className="public-form-label">Имя</span>
                    <input
                      className="public-form-input"
                      id="public-lead-name"
                      name="name"
                      type="text"
                      value={leadForm.name}
                      onChange={handleLeadFormChange}
                      placeholder="Как к вам обращаться"
                    />
                  </label>

                  <label className="public-form-field" htmlFor="public-lead-phone">
                    <span className="public-form-label">Телефон или Telegram</span>
                    <input
                      className="public-form-input"
                      id="public-lead-phone"
                      name="phone"
                      type="text"
                      value={leadForm.phone}
                      onChange={handleLeadFormChange}
                      placeholder="+7 / @username"
                    />
                  </label>

                  <label className="public-form-field" htmlFor="public-lead-object-type">
                    <span className="public-form-label">Тип объекта</span>
                    <select
                      className="public-form-select"
                      id="public-lead-object-type"
                      name="objectType"
                      value={leadForm.objectType}
                      onChange={handleLeadFormChange}
                    >
                      <option value="">Выберите тип объекта</option>
                      {objectTypeOptions.map((option) => (
                        <option value={option} key={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="public-form-field" htmlFor="public-lead-area">
                    <span className="public-form-label">Площадь</span>
                    <input
                      className="public-form-input"
                      id="public-lead-area"
                      name="area"
                      type="text"
                      value={leadForm.area}
                      onChange={handleLeadFormChange}
                      placeholder="Например, 52 м²"
                    />
                  </label>

                  <label className="public-form-field" htmlFor="public-lead-package-type">
                    <span className="public-form-label">Интересующий формат</span>
                    <select
                      className="public-form-select"
                      id="public-lead-package-type"
                      name="packageType"
                      value={leadForm.packageType}
                      onChange={handleLeadFormChange}
                    >
                      <option value="">Выберите формат</option>
                      {packageTypeOptions.map((option) => (
                        <option value={option} key={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="public-form-field" htmlFor="public-lead-contact-method">
                    <span className="public-form-label">Удобный способ связи</span>
                    <select
                      className="public-form-select"
                      id="public-lead-contact-method"
                      name="contactMethod"
                      value={leadForm.contactMethod}
                      onChange={handleLeadFormChange}
                    >
                      {contactMethodOptions.map((option) => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="public-form-field public-form-field-wide" htmlFor="public-lead-comment">
                    <span className="public-form-label">Комментарий</span>
                    <textarea
                      className="public-form-textarea"
                      id="public-lead-comment"
                      name="comment"
                      value={leadForm.comment}
                      onChange={handleLeadFormChange}
                      placeholder="Кратко опишите объект, задачу, сроки или что уже известно"
                      rows={5}
                    />
                  </label>
                </div>

                <label className="public-form-consent" htmlFor="public-lead-personal-data-consent">
                  <input
                    id="public-lead-personal-data-consent"
                    name="personalDataConsent"
                    type="checkbox"
                    checked={leadForm.personalDataConsent}
                    onChange={handleLeadFormChange}
                    required
                  />
                  <span>
                    Я согласен на{" "}
                    <a className="public-form-consent-link" href="/privacy">
                      обработку персональных данных
                    </a>{" "}
                    для обработки заявки и обратной связи.
                  </span>
                </label>

                <div className="public-form-footer">
                  <button
                    className="public-form-submit"
                    type="submit"
                    disabled={isLeadFormSubmitting || !leadForm.personalDataConsent}
                  >
                    {isLeadFormSubmitting ? "Отправляем..." : "Отправить заявку"}
                  </button>
                  {leadFormStatus && (
                    <p className="public-form-status" role="status" aria-live="polite">
                      {leadFormStatus}
                    </p>
                  )}
                </div>
              </form>
            </div>

            <aside className="public-contacts-side" aria-label="Будущая QR-визитка">
              <div className="public-contacts-qr-card">
                <div>
                  <h3>QR-визитка</h3>
                  <p>
                    Здесь будет QR-код на персональную визитку Danko BuildTech: контакты, сайт,
                    быстрый переход в мессенджер и информация по ремонту.
                  </p>
                </div>

                <div className="public-contacts-qr-placeholder" aria-label="Место под будущий QR-код визитки">
                  <strong>QR</strong>
                  <span>место под визитку</span>
                </div>

                <span className="public-contacts-qr-note">Визитка появится позже</span>

                <div className="public-contacts-list">
                  <h4>Что можно отправить:</h4>
                  <ul>
                    {contactsListItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
