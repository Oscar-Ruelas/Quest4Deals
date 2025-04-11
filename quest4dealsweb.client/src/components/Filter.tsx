interface FilterProps {
  filters: {
    platform: string;
    genre: string;
    price: string;
  };
  setFilters: (filters: any) => void;
  setIsFiltered: (isFiltered: boolean) => void;
  onReload: () => void;
}

function Filter({ filters, setFilters, setIsFiltered, onReload }: FilterProps) {
  /**
   * Updates the filter state based on the selected filter type and value.
   * If the selected value is not "All", "Genre", or "PriceOrder", it sets the filtered state to true because it means we are filtering.
   *
   * @param type - The type of filter being updated (e.g., "category", "price").
   * @param value - The selected value for the filter.
   */
  const handleFilterChange = (type: string, value: string) => {
    setFilters({
      ...filters,
      [type]: value,
    });
  };

  const handleApplyButton = () => {
    if (
      filters.genre !== "All" &&
      filters.platform !== "Genre" &&
      filters.price !== "PriceOrder"
    ) {
      setIsFiltered(true);
      onReload(); // refreshes the dashboard
    }
  };

  const handleClearButton = () => {
    setFilters({
      platform: "All",
      genre: "Genre",
      price: "PriceOrder",
    });
    setIsFiltered(false);
    onReload(); // refreshes the dashboard
  };

  return (
    <div className="filter">
      <h2>Filters</h2>
      <select
        name="platform"
        id="platform"
        value={filters.platform}
        onChange={(e) => handleFilterChange("platform", e.target.value)}
      >
        <option value="All">Platform</option>
        <option value="PC">PC</option>
        <option value="Playstation">Playstation</option>
        <option value="Xbox">Xbox</option>
        <option value="Switch">Switch</option>
      </select>
      <select
        name="genre"
        id="genre"
        value={filters.genre}
        onChange={(e) => handleFilterChange("genre", e.target.value)}
      >
        <option value="Genre">Genre</option>
        <option value="Action">Action</option>
        <option value="Adventure">Adventure</option>
        <option value="RPG">RPG</option>
        <option value="Sports">Sports</option>
        <option value="Strategy">Strategy</option>
        <option value="Cozy">Cozy</option>
        <option value="Simulation">Simulation</option>
      </select>
      <select
        name="price"
        id="price"
        value={filters.price}
        onChange={(e) => handleFilterChange("price", e.target.value)}
      >
        <option value="PriceOrder">Price Order By</option>
        <option value="Low_High">Lowest to Highest</option>
        <option value="High_Low">Highest to Lowest</option>
        <option value="Free">Free</option>
      </select>
      <button type="submit" onClick={handleApplyButton}>
        Apply
      </button>
      <button onClick={handleClearButton}>Clear</button>
    </div>
  );
}

export default Filter;
