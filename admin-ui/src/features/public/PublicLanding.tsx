import { useState } from "react";

const publicNavItems = [
  { label: "Услуги", href: "#services" },
  { label: "Объекты", href: "#projects" },
  { label: "Как работаем", href: "#process" },
  { label: "Контакты", href: "#contacts" },
];

export function PublicLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="public-landing">
      <header className="public-header">
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
            Рассчитать ремонт
          </a>
        </nav>

        <a className="public-action public-action-desktop" href="#contacts">
          Рассчитать ремонт
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
      </header>
    </div>
  );
}
