import { publicProcessCards, publicProcessSteps } from "../public-content";
import { usePublicProcessSteps } from "../hooks/usePublicProcessSteps";
import { PublicProcessSteps } from "./process/PublicProcessSteps";
import { PublicSectionContour } from "./PublicSectionContour";

type PublicProcessSectionProps = {
  getContourClassName: (sectionName: string, side: "left" | "right") => string;
};

export function PublicProcessSection({ getContourClassName }: PublicProcessSectionProps) {
  const { activeProcessIndex, processStepRefs } = usePublicProcessSteps();

  return (
    <section
      className="public-process"
      id="process"
      aria-labelledby="public-process-title"
      data-public-contour-section="process"
    >
      <PublicSectionContour sectionName="process" side="right" getContourClassName={getContourClassName} />

      <div className="public-process-layout">
        <div className="public-process-aside">
          <div className="public-process-head public-section-heading">
            <p className="public-section-kicker">Как работаем</p>
            <h2 id="public-process-title">Ведём ремонт как понятный процесс</h2>
            <p>
              От первой заявки до сдачи объекта: фиксируем вводные, формируем детальную смету,
              собираем комплектацию, ведём график и контролируем этапы работ.
            </p>
          </div>

          <div className="public-process-cards" aria-label="Ориентиры процесса">
            {publicProcessCards.map((card) => (
              <article className="public-process-card" key={card.title} tabIndex={0}>
                <h3 className="public-process-card-title">{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>

        <PublicProcessSteps
          steps={publicProcessSteps}
          activeProcessIndex={activeProcessIndex}
          processStepRefs={processStepRefs}
        />
      </div>
    </section>
  );
}
