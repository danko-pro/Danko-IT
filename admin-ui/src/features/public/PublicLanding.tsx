import "./public-redesign.css";
import { PublicApproachSection } from "./components/redesign/PublicApproachSection";
import { PublicContactsSection } from "./components/redesign/PublicContactsSection";
import { PublicFooter } from "./components/redesign/PublicFooter";
import { PublicHeader } from "./components/redesign/PublicHeader";
import { PublicHero } from "./components/redesign/PublicHero";
import { PublicMarquee } from "./components/redesign/PublicMarquee";
import { PublicPricingSection } from "./components/redesign/PublicPricingSection";
import { PublicProjectsSection } from "./components/redesign/PublicProjectsSection";
import { PublicRevealObserver } from "./components/redesign/PublicRevealObserver";
import { PublicPlatformSection } from "./components/redesign/PublicPlatformSection";

export function PublicLanding() {
  return (
    <div className="dk-landing">
      <PublicRevealObserver />
      <PublicHeader />

      <main>
        <PublicHero />
        <PublicMarquee />
        <PublicProjectsSection />
        <PublicApproachSection />
        <PublicPlatformSection />
        <PublicPricingSection />
        <PublicContactsSection />
      </main>

      <PublicFooter />
    </div>
  );
}
