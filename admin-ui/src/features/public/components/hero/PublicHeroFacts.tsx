type PublicHeroFactsProps = {
  facts: string[];
};

export function PublicHeroFacts({ facts }: PublicHeroFactsProps) {
  return (
    <ul className="public-hero-facts" aria-label="Факты о работе Danko">
      {facts.map((fact) => (
        <li className="public-hero-fact" key={fact}>
          <span>{fact}</span>
        </li>
      ))}
    </ul>
  );
}
