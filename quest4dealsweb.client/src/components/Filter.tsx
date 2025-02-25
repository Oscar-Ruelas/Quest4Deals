function Filter() {
  return (
    <div className="filter">
      <h2>Filters</h2>
      <select name="platform" id="platform">
        <option value="All">Platform</option>
        <option value="PC">PC</option>
        <option value="Playstation">Playstation</option>
        <option value="Xbox">Xbox</option>
        <option value="Switch">Switch</option>
      </select>
      <select name="genre" id="genre">
        <option value="Genre">Genre</option>
        <option value="Action">Action</option>
        <option value="Adventure">Adventure</option>
        <option value="RPG">RPG</option>
        <option value="Sports">Sports</option>
        <option value="Strategy">Strategy</option>
        <option value="Cozy">Cozy</option>
        <option value="Simulation">Simulation</option>
      </select>
      <select name="price" id="price">
        <option value="PriceOrder">Price Order By</option>
        <option value="Low_High">Lowest to Highest</option>
        <option value="High_Low">Highest to Lowest</option>
        <option value="Free">Free</option>
      </select>
    </div>
  );
}

export default Filter;
