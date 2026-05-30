import { formatMoney } from "../../estimate/format";

export type EstimateMobileTotalProps = {
  total: number;
  pricePerSquareMeter: number;
  onNavigateToCosts: () => void;
};

export function EstimateMobileTotal({ total, pricePerSquareMeter, onNavigateToCosts }: EstimateMobileTotalProps) {
  return (
    <aside className="public-estimate-mobile-total" aria-label="Краткий итог сметы">
      <div className="public-estimate-mobile-total-main">
        <span>Итого</span>
        <strong>{formatMoney(total)}</strong>
      </div>
      <div className="public-estimate-mobile-total-rate">
        <span>₽/м²</span>
        <strong>{formatMoney(pricePerSquareMeter)}/м²</strong>
      </div>
      <a
        className="public-estimate-mobile-total-link"
        href="#estimate-costs"
        onClick={(event) => {
          event.preventDefault();
          onNavigateToCosts();
        }}
      >
        Итог
      </a>
    </aside>
  );
}
