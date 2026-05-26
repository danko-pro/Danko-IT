import { useState } from "react";

import { publicNavItems } from "../public-content";
import { usePublicHeaderVisibility } from "../hooks/usePublicHeaderVisibility";

export function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHeaderHidden = usePublicHeaderVisibility(isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={`public-header-shell${isHeaderHidden ? " public-header-shell-hidden" : ""}`}>
      <div className="public-header">
        <a className="public-brand" href="/" aria-label="Danko - главная">
          <img className="public-brand-mark" src="/brand/danko-logo-mark.png" alt="" aria-hidden="true" />
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
  );
}
