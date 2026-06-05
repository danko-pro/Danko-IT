import type { AggregatedClientLine } from "../../estimate/aggregate-client-lines";
import {
  formatDisplayQuantity,
  formatDisplayUnit,
  formatMoney,
  formatPresentationNote,
} from "../../estimate/format";
import {
  collectDocumentSectionLines,
  type EstimateDocumentLine,
  type EstimateDocumentSection,
  type EstimateDocumentTotals,
  type PublicEstimateDocument,
} from "../../estimate/public-estimate-document";
import type { EstimateObjectMeta } from "../../estimate/context";

type PublicEstimatePdfDocumentProps = {
  document: PublicEstimateDocument;
};

type PdfLineRow = {
  id: string;
  title: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  note?: string;
};

function toPdfLineRow(line: EstimateDocumentLine | AggregatedClientLine): PdfLineRow {
  const aggregated = line as AggregatedClientLine;
  const note = aggregated.presentationNote ?? line.note;

  return {
    id: line.id,
    title: line.title,
    quantity: aggregated.displayQuantity ?? line.quantity,
    unit: formatDisplayUnit(aggregated.displayUnit ?? line.unit),
    unitPrice: aggregated.displayUnitPrice ?? line.unitPrice,
    total: line.total,
    note: note ? formatPresentationNote(note) : note,
  };
}

function formatGeneratedAt(isoDate: string): string {
  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatObjectMeta(object: EstimateObjectMeta): string[] {
  const lines: string[] = [];

  if (object.complexName.trim()) {
    lines.push(object.complexName.trim());
  }

  const addressParts = [object.address.trim(), object.apartmentNumber.trim()].filter(Boolean);

  if (addressParts.length > 0) {
    lines.push(addressParts.join(", "));
  }

  if (object.contact.trim()) {
    lines.push(object.contact.trim());
  }

  return lines;
}

function resolvePresentationGroups(section: EstimateDocumentSection) {
  return section.presentationGroups?.filter((group) => group.lines.length > 0) ?? [];
}

function PdfTotalsSummary({ totals, floorArea }: { totals: EstimateDocumentTotals; floorArea?: number }) {
  return (
    <dl className="public-estimate-pdf-document-summary">
      <div>
        <dt>Работы</dt>
        <dd>{formatMoney(totals.works)}</dd>
      </div>
      <div>
        <dt>Материалы</dt>
        <dd>{formatMoney(totals.materials)}</dd>
      </div>
      <div>
        <dt>Оборудование</dt>
        <dd>{formatMoney(totals.equipment)}</dd>
      </div>
      <div>
        <dt>Расходники</dt>
        <dd>{formatMoney(totals.consumables)}</dd>
      </div>
      <div className="public-estimate-pdf-document-summary-total">
        <dt>Итого</dt>
        <dd>{formatMoney(totals.total)}</dd>
      </div>
      {floorArea !== undefined && floorArea > 0 ? (
        <div>
          <dt>₽/м²</dt>
          <dd>{formatMoney(totals.pricePerSquareMeter ?? totals.total / floorArea)}/м²</dd>
        </div>
      ) : null}
    </dl>
  );
}

function PdfLineTable({ lines }: { lines: PdfLineRow[] }) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <table className="public-estimate-pdf-document-table">
      <thead>
        <tr>
          <th scope="col">Позиция</th>
          <th scope="col">Кол-во</th>
          <th scope="col">Ед.</th>
          <th scope="col">Цена</th>
          <th scope="col">Сумма</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => {
          const pricePending = line.note === "уточняется";

          return (
            <tr key={line.id}>
              <td>
                <span className="public-estimate-pdf-document-line-title">{line.title}</span>
                {line.note && line.note !== "уточняется" ? (
                  <span className="public-estimate-pdf-document-line-note">{line.note}</span>
                ) : null}
              </td>
              <td>{formatDisplayQuantity(line.quantity)}</td>
              <td>{line.unit}</td>
              <td>{pricePending ? "—" : formatMoney(line.unitPrice)}</td>
              <td>{pricePending ? "—" : formatMoney(line.total)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PdfDocumentSection({ section }: { section: EstimateDocumentSection }) {
  const presentationGroups = resolvePresentationGroups(section);
  const flatLines = collectDocumentSectionLines(section)
    .filter((line) => line.isIncluded)
    .map(toPdfLineRow);

  return (
    <section className="public-estimate-pdf-document-section">
      <div className="public-estimate-pdf-document-section-head">
        <h2>{section.title}</h2>
        <strong>{formatMoney(section.totals.total)}</strong>
      </div>

      {section.description ? <p className="public-estimate-pdf-document-section-description">{section.description}</p> : null}
      {section.specIntro ? <p className="public-estimate-pdf-document-section-intro">{section.specIntro}</p> : null}

      {presentationGroups.length > 0 ? (
        presentationGroups.map((group) => (
          <div className="public-estimate-pdf-document-group" key={group.kind}>
            <h3>{group.title}</h3>
            <PdfLineTable lines={group.lines.map(toPdfLineRow)} />
          </div>
        ))
      ) : (
        <PdfLineTable lines={flatLines} />
      )}
    </section>
  );
}

export function PublicEstimatePdfDocument({ document }: PublicEstimatePdfDocumentProps) {
  const brand = document.meta.brand;
  const objectLines = document.meta.object ? formatObjectMeta(document.meta.object) : [];

  return (
    <article className="public-estimate-pdf-document" aria-hidden="true">
      <header className="public-estimate-pdf-document-header">
        {brand ? (
          <div className="public-estimate-pdf-document-brand">
            <img src={brand.logoUrl} alt="" aria-hidden="true" />
            <div>
              <strong>{brand.name}</strong>
              {brand.subtitle ? <span>{brand.subtitle}</span> : null}
            </div>
          </div>
        ) : null}

        <div className="public-estimate-pdf-document-title-block">
          <h1>{document.meta.title}</h1>
          <p className="public-estimate-pdf-document-generated-at">
            Сформировано: {formatGeneratedAt(document.meta.generatedAt)}
          </p>
          {document.meta.estimateId ? (
            <p className="public-estimate-pdf-document-estimate-id">№ {document.meta.estimateId}</p>
          ) : null}
        </div>
      </header>

      {objectLines.length > 0 ? (
        <section className="public-estimate-pdf-document-object" aria-label="Объект">
          <h2>Объект</h2>
          {objectLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      ) : null}

      <section className="public-estimate-pdf-document-totals" aria-label="Итоги сметы">
        <h2>Итоги</h2>
        <PdfTotalsSummary totals={document.totals} floorArea={document.meta.floorArea} />
      </section>

      {document.sections.map((section) => (
        <PdfDocumentSection key={section.sectionId} section={section} />
      ))}

      {document.appendices?.disclaimers?.length ? (
        <section className="public-estimate-pdf-document-appendix" aria-label="Примечания">
          <h2>Примечания</h2>
          {document.appendices.disclaimers.map((disclaimer) => (
            <p key={disclaimer}>{disclaimer}</p>
          ))}
        </section>
      ) : null}
    </article>
  );
}
