import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { FlooringProcurementLine } from "./public-estimate-flooring-procurement";
import type { EstimateSpecSection } from "./public-estimate-plumbing-zones";

type EstimateSpecOverlayProps = {
  title: string;
  subtitle?: string;
  sections: EstimateSpecSection[];
  procurementLines?: FlooringProcurementLine[];
  formatMoney: (value: number) => string;
  formatQuantity: (value: number) => string;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function EstimateSpecOverlay({
  title,
  subtitle,
  sections,
  procurementLines,
  formatMoney,
  formatQuantity,
  onClose,
}: EstimateSpecOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  // Блокируем прокрутку фона, ставим фокус на кнопку «Назад» и возвращаем фокус
  // на элемент-открывашку при закрытии.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  // Закрытие по Esc и простая фокус-ловушка внутри окна.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const panel = panelRef.current;

      if (!panel) {
        return;
      }

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const grouped = sections.length > 1;
  const grandTotal = sections.reduce((sum, section) => sum + section.totals.total, 0);

  const overlay = (
    <div
      className="public-estimate-spec-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="public-estimate-spec-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <div className="public-estimate-spec-modal-head">
          <button
            ref={closeButtonRef}
            type="button"
            className="public-estimate-spec-modal-back"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5 8 12l7 7" />
            </svg>
            Назад
          </button>
          <div className="public-estimate-spec-modal-heading">
            <h2 id={headingId}>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="public-estimate-spec-modal-close"
            aria-label="Закрыть спецификацию"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6 18 18" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="public-estimate-spec-modal-body">
          {sections.length === 0 ? (
            <p className="public-estimate-spec-modal-empty">В этом разделе пока нет позиций.</p>
          ) : (
            sections.map((section) => (
              <div className="public-estimate-spec-modal-section" key={section.id}>
                {grouped ? (
                  <div className="public-estimate-spec-modal-section-head">
                    <h3>{section.title}</h3>
                    <strong>{formatMoney(section.totals.total)}</strong>
                  </div>
                ) : null}
                {section.specIntro ? (
                  <p className="public-estimate-spec-modal-intro">{section.specIntro}</p>
                ) : null}
                <ul className="public-estimate-spec-modal-list">
                  {section.items.map((item) => {
                    const pricePending = item.note === "уточняется";
                    return (
                      <li key={item.id}>
                        <span className="public-estimate-spec-modal-line-title">{item.title}</span>
                        <span className="public-estimate-spec-modal-line-meta">
                          {formatQuantity(item.quantity)} {item.unit}
                          {pricePending ? (
                            <> · уточняется</>
                          ) : (
                            <> × {formatMoney(item.unitPrice)}</>
                          )}
                        </span>
                        <strong>{pricePending ? "—" : formatMoney(item.total)}</strong>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="public-estimate-spec-modal-foot">
          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginLeft: "auto" }}>
            <span>{grouped ? "Итого по всем разделам" : "Итого по разделу"}</span>
            <strong>{formatMoney(grandTotal)}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
