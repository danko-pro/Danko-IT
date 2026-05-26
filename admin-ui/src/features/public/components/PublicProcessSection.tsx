import { publicProcessCards, publicProcessSteps } from "../public-content";
import { usePublicProcessSteps } from "../hooks/usePublicProcessSteps";
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

        <ol className="public-process-timeline" aria-label="Этапы работы">
          {publicProcessSteps.map((step, index) => (
            <li
              className={`public-process-step${
                activeProcessIndex === index ? " public-process-step-active" : ""
              }`}
              key={step.title}
              ref={(element) => {
                processStepRefs.current[index] = element;
              }}
              data-process-index={index}
              tabIndex={0}
            >
              <span className="public-process-step-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="public-process-step-content">
                <div className="public-process-step-head">
                  <h3>{step.title}</h3>
                  <span className="public-process-step-meta">{step.meta}</span>
                </div>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
