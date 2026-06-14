const FOOTER_NAV = [
  { href: "#projects", label: "Объекты" },
  { href: "#approach", label: "Подход" },
  { href: "#pricing", label: "Цены" },
  { href: "#contacts", label: "Контакты" },
];

export function PublicFooter() {
  return (
    <footer className="dk-footer">
      <div className="dk-wrap dk-footer__top">
        <div className="dk-brand dk-brand--light">
          <img className="dk-brand__mark" src="/brand/danko-logo-mark.png" alt="" aria-hidden="true" />
          <span className="dk-brand__copy">
            <span className="dk-brand__name">Danko</span>
            <span className="dk-brand__sub">дизайн / отделка / комплектация · Калининград</span>
          </span>
        </div>

        <nav className="dk-footer__nav" aria-label="Навигация подвала">
          {FOOTER_NAV.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="dk-footer__divider">
        <div className="dk-wrap dk-footer__bottom">
          <span>© 2026 Danko · Ремонт квартир и апартаментов под ключ</span>
          <a href="/privacy">Обработка персональных данных</a>
        </div>
      </div>
    </footer>
  );
}
