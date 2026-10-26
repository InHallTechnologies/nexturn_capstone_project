import { FoodImage, Icon, money, useResource } from "./shared";
import { Atmosphere, Depth, Reveal } from "./Motion";

export default function Landing({ onDiscover }) {
  const featured = useResource("/menu?sort=name&limit=3");
  return (
    <>
      <section className="cinematic-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <Reveal>
            <p className="eyebrow">
              <span className="spark">✳</span> THE EVERYDAY, ELEVATED
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 id="hero-title">
              Ordinary day.
              <br />
              <em>Extraordinary</em>
              <br />
              meal<span className="gold">.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="hero-description">
              Some things make the whole day better.
              <br />A meal made with care is one of them.
            </p>
            <div className="hero-actions">
              <a href="#food-menu" className="btn">
                Find your flavour <Icon name="arrow" size={18} />
              </a>
              <a href="#hearth-story" className="hero-secondary">
                A taste of hearth <span>↗</span>
              </a>
            </div>
          </Reveal>
          <div className="hero-edition">
            <span>THE HEARTH EDIT — 01</span>
            <span>
              A little care.
              <br />
              <em>In every meal.</em>
            </span>
          </div>
        </div>
        <Reveal className="hero-stage" delay={0.12}>
          <div className="stage-glow" aria-hidden="true" />
          <div className="stage-ring ring-one" aria-hidden="true" />
          <div className="stage-ring ring-two" aria-hidden="true" />
          <span className="stage-coordinate">GOOD FOOD, GOOD DAYS.</span>
          <Atmosphere />
          <Depth className="hero-dish" strength={9}>
            <FoodImage
              src="/images/hearth-biryani.webp"
              alt="Saffron biryani with golden chicken, fresh mint and fried onions in a charcoal ceramic bowl"
              loading="eager"
              fetchPriority="high"
              width="1100"
              height="1100"
            />
          </Depth>
          <span className="stage-spark" aria-hidden="true">
            ✳
          </span>
          <div className="hero-food-note">
            <span className="tiny-line" />
            <span>
              Comfort, with
              <br />
              <em>a little character.</em>
            </span>
          </div>
          <div className="hero-seal">
            <Icon name="flame" size={19} />
            <span>
              THOUGHTFULLY
              <br />
              MADE. ALWAYS.
            </span>
          </div>
        </Reveal>
        <a className="scroll-cue" href="#hearth-story">
          <span>SCROLL TO SAVOUR</span>
          <Icon name="down" size={16} />
        </a>
      </section>
      <div className="service-strip">
        <span>
          <Icon name="flame" size={18} /> Cooked to order
        </span>
        <span>
          <Icon name="bag" size={18} /> Pay on delivery
        </span>
        <span>
          <Icon name="check" size={18} /> A little care in every meal
        </span>
        <span className="strip-index">EST. FOR YOUR EVERYDAY</span>
      </div>
      <Reveal as="section" className="brand-story" id="hearth-story">
        <div className="story-label">
          <p className="eyebrow">THE HEARTH PHILOSOPHY</p>
          <span className="story-number">01 /</span>
        </div>
        <div>
          <h2>
            Not just something to eat.
            <br />
            Something to <em>look forward to.</em>
          </h2>
          <div className="story-bottom">
            <span className="story-flame">
              <Icon name="flame" size={26} />
            </span>
            <p>
              Familiar favourites. A few new discoveries. From the first
              fragrant bite to the last spoonful, we believe your everyday meal
              deserves a little more thought.
            </p>
            <a href="#food-menu" className="text-link">
              Explore our menu <Icon name="arrow" size={18} />
            </a>
          </div>
        </div>
      </Reveal>
      {featured.data?.items.length > 0 && (
        <section className="featured-section" aria-labelledby="featured-title">
          <Reveal className="editorial-heading">
            <div>
              <p className="eyebrow">AN INVITATION TO INDULGE</p>
              <h2 id="featured-title">
                A little <em>temptation.</em>
              </h2>
            </div>
            <a className="text-link" href="#food-menu">
              The full menu <Icon name="arrow" size={18} />
            </a>
          </Reveal>
          <div className="featured-grid">
            {featured.data.items.map((food, index) => (
              <Reveal key={food._id} delay={index * 0.07}>
                <button
                  className="featured-dish"
                  onClick={() => onDiscover(food)}
                  aria-label={`Explore ${food.name}`}
                >
                  <div className="featured-image">
                    <FoodImage src={food.image} alt={food.name} />
                    <span className="featured-number">0{index + 1}</span>
                    <span className="featured-arrow">
                      <Icon name="arrow" size={21} />
                    </span>
                    {!food.available && (
                      <span className="sold-out">Currently unavailable</span>
                    )}
                  </div>
                  <div className="featured-meta">
                    <div>
                      <p className="eyebrow">{food.category}</p>
                      <h3>{food.name}</h3>
                    </div>
                    <span>{money(food.price)}</span>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export function ClosingStory() {
  return (
    <>
      <Reveal as="section" className="ordering-story">
        <div>
          <p className="eyebrow">FROM CRAVING TO COMFORT</p>
          <h2>
            Your next good meal.
            <br />
            <em>Simply done.</em>
          </h2>
        </div>
        <ol>
          {[
            ["Find your flavour", "Explore the menu and add what you love."],
            ["Make it yours", "Choose your address and leave a kitchen note."],
            [
              "Leave it to us",
              "Follow your order from our kitchen to your door.",
            ],
          ].map(([title, copy], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
      <Reveal as="section" className="closing-story">
        <Icon name="flame" size={30} />
        <p className="eyebrow">GOOD DAYS BEGIN WITH GOOD TASTE</p>
        <h2>
          Make room for
          <br />
          <em>something good.</em>
        </h2>
        <a className="btn" href="#food-menu">
          Explore our menu <Icon name="arrow" size={18} />
        </a>
        <span className="closing-wordmark" aria-hidden="true">
          hearth.
        </span>
      </Reveal>
    </>
  );
}
