import { PublicContactsSection } from "./components/PublicContactsSection";
import { PublicHeader } from "./components/PublicHeader";
import { PublicHero } from "./components/PublicHero";
import { PublicPricingSection } from "./components/PublicPricingSection";
import { PublicProcessSection } from "./components/PublicProcessSection";
import { PublicProjectsSection } from "./components/PublicProjectsSection";
import { PublicSectionContour } from "./components/PublicSectionContour";
import { PublicServicesSection } from "./components/PublicServicesSection";
import { usePublicContourRoute } from "./hooks/usePublicContourRoute";

export function PublicLanding() {
  const { getContourClassName } = usePublicContourRoute();

  return (
    <div className="public-landing">
      <PublicHeader />

      <main className="public-main">
        <PublicHero />
        <PublicServicesSection getContourClassName={getContourClassName} />

        <section
          className="public-projects"
          id="projects"
          aria-labelledby="public-projects-title"
          data-public-contour-section="projects"
        >
          <PublicSectionContour sectionName="projects" side="left" getContourClassName={getContourClassName} />
          <PublicPricingSection />
          <PublicProjectsSection />
        </section>

        <PublicProcessSection getContourClassName={getContourClassName} />
        <PublicContactsSection getContourClassName={getContourClassName} />
      </main>
    </div>
  );
}
