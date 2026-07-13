import { useState } from "react";

import { usePublicHeaderVisibility } from "../../hooks/usePublicHeaderVisibility";
import { usePublicNavigationState } from "../../hooks/usePublicNavigationState";

const NAV_ITEMS = [
  { href: "#projects", label: "Объекты" },
  { href: "#approach", label: "Подход" },
  { href: "#platform", label: "Платформа" },
  { href: "#pricing", label: "Цены" },
  { href: "#contacts", label: "Контакты" },
];

export function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHeaderHidden = usePublicHeaderVisibility(isMenuOpen);
  const activeHref = usePublicNavigationState(isMenuOpen, setIsMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={`dk-header${isHeaderHidden ? " dk-header--hidden" : ""}`}>
      <div className="dk-header__inner">
        <a className="dk-brand" href="#top" aria-label="Danko — главная">
          <img className="dk-brand__mark" src="/brand/danko-logo-mark.png" alt="" aria-hidden="true" />
          <span className="dk-brand__copy">
            <span className="dk-brand__name">Danko</span>
            <span className="dk-brand__sub">дизайн / отделка / комплектация</span>
          </span>
        </a>

        <nav id="dk-public-nav" className={`dk-nav${isMenuOpen ? " dk-nav--open" : ""}`} aria-label="Навигация публичного сайта">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} aria-current={activeHref === item.href ? "location" : undefined} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
          <a className="dk-cta dk-cta--mobile" href="/estimate" onClick={closeMenu}>
            Рассчитать стоимость
          </a>
        </nav>

        <a className="dk-cta dk-cta--desktop" href="/estimate">
          Рассчитать стоимость
        </a>

        <button
          className="dk-menu-btn"
          type="button"
          aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={isMenuOpen}
          aria-controls="dk-public-nav"
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
