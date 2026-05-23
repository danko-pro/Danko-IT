export function PublicLanding() {
  return (
    <div className="public-landing">
      <header className="public-header">
        <a className="public-brand" href="/" aria-label="Danko BuildTech">
          <span className="public-brand-name">Danko BuildTech</span>
          <span className="public-brand-subtitle">ремонт / отделка / комплектация</span>
        </a>

        <nav className="public-nav" aria-label="Навигация сайта">
          <a href="#company">О компании</a>
          <a href="#objects">Объекты</a>
          <a href="#services">Услуги</a>
          <a href="#contacts">Контакты</a>
        </nav>

        <a className="public-action" href="/app">
          Вход для команды
        </a>
      </header>
    </div>
  );
}
