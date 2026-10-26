import { FoodImage, Icon, money } from "./shared";
import { Depth, Reveal } from "./Motion";

export default function FoodCard({
  food,
  index,
  quantity,
  disabled,
  onAdd,
  onReview,
}) {
  return (
    <Reveal delay={Math.min(index, 5) * 0.045}>
      <Depth
        className={`food-card ${!food.available ? "is-unavailable" : ""}`}
        strength={3}
      >
        <article>
          <div className="food-image">
            <FoodImage src={food.image} alt={food.name} />
            <span
              className={`diet-marker ${food.veg ? "veg" : "nonveg"}`}
              role="img"
              aria-label={food.veg ? "Vegetarian" : "Non-vegetarian"}
            >
              ●
            </span>
            {!food.available && (
              <span className="sold-out">Currently unavailable</span>
            )}
            {quantity > 0 && (
              <span className="in-cart-label">
                <Icon name="bag" size={13} />
                {quantity} in your bag
              </span>
            )}
          </div>
          <div className="food-info">
            <p className="food-category">{food.category}</p>
            <h3>{food.name}</h3>
            <p>{food.description}</p>
            {food.preparation_minutes != null && (
              <span className="dish-prep">
                <Icon name="clock" size={13} /> {food.preparation_minutes} min
                preparation
              </span>
            )}
            <button className="review-link" onClick={onReview}>
              <Icon name="star" size={12} /> Customer reviews <span>↗</span>
            </button>
            <div className="food-bottom">
              <strong>{money(food.price)}</strong>
              <button
                className="btn add-btn"
                disabled={!food.available || disabled}
                onClick={onAdd}
                aria-label={`Add ${food.name} to cart`}
              >
                {food.available ? "Add" : "Unavailable"}
                <span aria-hidden="true">+</span>
              </button>
            </div>
          </div>
        </article>
      </Depth>
    </Reveal>
  );
}
