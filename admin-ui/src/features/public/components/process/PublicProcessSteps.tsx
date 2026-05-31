import type { MutableRefObject } from "react";

type PublicProcessStep = {
  title: string;
  description: string;
  meta: string;
};

export type PublicProcessStepsProps = {
  steps: PublicProcessStep[];
  activeProcessIndex: number;
  processStepRefs: MutableRefObject<Array<HTMLLIElement | null>>;
};

export function PublicProcessSteps({
  steps,
  activeProcessIndex,
  processStepRefs,
}: PublicProcessStepsProps) {
  return (
    <ol className="public-process-timeline" aria-label="Этапы работы">
      {steps.map((step, index) => (
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
  );
}
