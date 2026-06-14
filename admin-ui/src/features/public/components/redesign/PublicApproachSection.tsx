import { publicApproachSteps, publicServiceItems } from "../../public-content";

export function PublicApproachSection() {
  return (
    <section className="dk-section dk-section--white dk-approach dk-reveal" id="approach" aria-labelledby="dk-approach-title">
      <div className="dk-wrap">
        <div className="dk-head dk-head--stack">
          <p className="dk-section-kicker">Подход</p>
          <h2 className="dk-section-title" id="dk-approach-title">
            Закрываем ремонт
            <br />
            как единый процесс
          </h2>
          <p className="dk-section-lead">
            От идеи и расчёта до отделки, комплектации и сдачи объекта — без хаоса и потерянных материалов.
          </p>
        </div>

        <div className="dk-approach__grid">
          {publicServiceItems.map((service, index) => (
            <div className="dk-svc" key={service.title}>
              <span className="dk-svc__num">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="dk-svc__title">{service.title}</h3>
              <p className="dk-svc__line">{service.description}</p>
            </div>
          ))}
        </div>

        <div className="dk-steps">
          {publicApproachSteps.map((step, index) => (
            <article className="dk-step" key={step.title}>
              <div className="dk-step__head">
                <span className="dk-step__num">{String(index + 1).padStart(2, "0")}</span>
                <span className="dk-step__meta">{step.meta}</span>
              </div>
              <h3 className="dk-step__title">{step.title}</h3>
              <p className="dk-step__desc">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
