import { publicMarqueeItems } from "../../public-content";

export function PublicMarquee() {
  return (
    <div className="dk-marquee" aria-hidden="true">
      <div className="dk-marquee__track">
        {[0, 1].map((group) => (
          <div className="dk-marquee__group" key={group}>
            {publicMarqueeItems.map((item, index) => (
              <span className="dk-marquee__item" key={`${group}-${index}`}>
                {item}
                <span className="dk-marquee__dot" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
