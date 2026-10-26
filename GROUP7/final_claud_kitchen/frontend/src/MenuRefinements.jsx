export default function MenuRefinements({ filters, onFilter, prefix }) {
  return (
    <>
      <div className="refinement-field">
        <label htmlFor={`${prefix}-diet`}>Dietary preference</label>
        <select
          id={`${prefix}-diet`}
          value={filters.veg}
          onChange={(event) => onFilter("veg", event.target.value)}
        >
          <option value="">All diets</option>
          <option value="true">Vegetarian</option>
          <option value="false">Non-vegetarian</option>
        </select>
      </div>
      <div className="refinement-field">
        <label htmlFor={`${prefix}-sort`}>Sort dishes</label>
        <select
          id={`${prefix}-sort`}
          value={filters.sort}
          onChange={(event) => onFilter("sort", event.target.value)}
        >
          <option value="name">Sort by name</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>
      <label className="max-price">
        Up to ₹
        <input
          aria-label="Maximum price in rupees"
          type="number"
          min="0"
          max="100000"
          placeholder="Any"
          value={filters.max}
          onChange={(event) => onFilter("max", event.target.value)}
        />
      </label>
    </>
  );
}
