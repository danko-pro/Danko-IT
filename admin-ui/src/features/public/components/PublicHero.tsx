import { publicHeroFacts } from "../public-content";
import { PublicHeroActions } from "./hero/PublicHeroActions";
import { PublicHeroFacts } from "./hero/PublicHeroFacts";
import { PublicHeroVisual } from "./hero/PublicHeroVisual";

export function PublicHero() {
  return (
    <section className="public-hero" aria-labelledby="public-hero-title">
      <div className="public-hero-tech-bg" aria-hidden="true">
        <svg className="public-hero-blueprint" viewBox="0 0 1180 620" focusable="false">
          <defs>
            <pattern id="publicHeroGrid" width="44" height="44" patternUnits="userSpaceOnUse">
              <path className="public-hero-grid-line" d="M 44 0 L 0 0 0 44" />
            </pattern>
            <linearGradient id="publicHeroSignal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#9b792f" stopOpacity="0" />
              <stop offset="44%" stopColor="#b9903f" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#1e514a" stopOpacity="0.12" />
            </linearGradient>
          </defs>

          <rect className="public-hero-grid-plane" width="1180" height="620" fill="url(#publicHeroGrid)" />

          <g className="public-hero-plan-lines">
            <path d="M108 426H310V318H498V136H830V244H1014V478H742V552H404V482H108Z" />
            <path d="M310 426V552M498 318H742V552M742 244V478M830 136V244" />
            <path d="M158 482H252M560 390H692M802 318H944M390 198H498M846 430H966" />
            <path d="M404 482V426M604 136V244M926 244V318" />
            <path d="M214 426C214 388 244 358 282 358M498 246C544 246 580 282 580 318M742 374C790 374 828 412 828 478" />
          </g>

          <g className="public-hero-data-lines">
            <path className="public-hero-signal-path" d="M172 356C326 282 498 412 646 328S902 210 1040 284" />
            <path className="public-hero-data-path" d="M262 248H414L496 190H672L742 244H912" />
            <path className="public-hero-data-path public-hero-data-path-soft" d="M368 520H536L610 462H782L842 410H1012" />
          </g>

          <g className="public-hero-nodes">
            <circle className="public-hero-node public-hero-node-a" cx="262" cy="248" r="5" />
            <circle className="public-hero-node public-hero-node-b" cx="496" cy="190" r="5" />
            <circle className="public-hero-node public-hero-node-c" cx="742" cy="244" r="5" />
            <circle className="public-hero-node public-hero-node-d" cx="842" cy="410" r="5" />
            <circle className="public-hero-node public-hero-node-gold" cx="646" cy="328" r="6" />
          </g>
        </svg>
      </div>

      <div className="public-hero-content">
        <p className="public-hero-kicker">Danko · дизайн / отделка / комплектация</p>
        <h1 id="public-hero-title">
          Ремонт квартир и апартаментов под ключ в Калининграде
        </h1>
        <p className="public-hero-description">
          От идеи и расчёта до отделки, комплектации и сдачи объекта. Работаем с квартирами,
          апартаментами и инвесторскими проектами.
        </p>

        <PublicHeroActions />

        <PublicHeroFacts facts={publicHeroFacts} />
      </div>

      <PublicHeroVisual />
    </section>
  );
}
