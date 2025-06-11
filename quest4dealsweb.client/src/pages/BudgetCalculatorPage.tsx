// src/pages/BudgetCalculatorPage.tsx
import { useState, useMemo, FormEvent, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "../styling/BudgetCalculatorPage.css";
import { Game } from "../components/Gamecard"; // Assuming Game type is suitable for search results

interface BudgetGameEntry {
    id: string;
    title: string;
    platform: string; // This will be the platform NAME
    price: number;
}

interface PlatformPriceOption {
    slug: string;
    name: string;
    price?: number; // Price is now optional for the fallback
}

interface NexardaPriceOffer {
    store: { name: string; image: string; };
    edition: string;
    edition_full?: string;
    price: number;
    platform?: { slug: string; name: string; };
    available: boolean;
    url: string;
}

interface NexardaPricesResponse {
    prices: {
        list: NexardaPriceOffer[];
    };
}


function BudgetCalculatorPage() {
    const [budget, setBudget] = useState<string>("");
    const [gamesInBudget, setGamesInBudget] = useState<BudgetGameEntry[]>([]);
    const [taxRate, setTaxRate] = useState<string>("");

    // Form states
    const [gameSearchInput, setGameSearchInput] = useState<string>("");
    const [platformInput, setPlatformInput] = useState<string>(""); // Holds selected platform slug
    const [priceDisplay, setPriceDisplay] = useState<string>(""); // For displaying the price

    // Autocomplete state
    const [activeApiQueryChar, setActiveApiQueryChar] = useState<string>("");
    const [rawApiResults, setRawApiResults] = useState<Game[]>([]);
    const [filteredDisplaySuggestions, setFilteredDisplaySuggestions] = useState<Game[]>([]);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);

    // Selected game and its platform-specific prices
    const [selectedGameForPrices, setSelectedGameForPrices] = useState<Game | null>(null);
    const [platformPriceOptions, setPlatformPriceOptions] = useState<PlatformPriceOption[]>([]);
    const [loadingPlatformPrices, setLoadingPlatformPrices] = useState<boolean>(false);

    const fetchInitialSuggestions = useCallback(async (queryChar: string) => {
        if (!queryChar) return;
        setLoadingSuggestions(true);
        setActiveApiQueryChar(queryChar);
        setRawApiResults([]); // Clear previous raw results
        setFilteredDisplaySuggestions([]);
        try {
            // Fetch a decent number of results for the first character to allow local filtering
            const response = await fetch(`/api/nexarda/search?query=${encodeURIComponent(queryChar)}&limit=30`);
            if (!response.ok) throw new Error("Failed to fetch initial suggestions");
            const data = await response.json();
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            const newRawResults = parsed.results?.items || [];
            setRawApiResults(newRawResults);
            // Initial filter based on the single char queryChar (which is gameSearchInput at this point)
            setFilteredDisplaySuggestions(newRawResults.filter(game => game.title.toLowerCase().startsWith(queryChar.toLowerCase())));
            setShowSuggestions(true);
        } catch (error) {
            console.error("Error fetching initial game suggestions:", error);
            setRawApiResults([]);
            setFilteredDisplaySuggestions([]);
        } finally {
            setLoadingSuggestions(false);
        }
    }, []);

    useEffect(() => {
        if (gameSearchInput === "") {
            setActiveApiQueryChar("");
            setRawApiResults([]);
            setFilteredDisplaySuggestions([]);
            setShowSuggestions(false);
            setSelectedGameForPrices(null);
            setPlatformPriceOptions([]);
            setPlatformInput("");
            setPriceDisplay("");
            return;
        }

        const firstChar = gameSearchInput[0].toLowerCase();
        if (firstChar !== activeApiQueryChar.toLowerCase()) {
            fetchInitialSuggestions(firstChar); // API call only if first char changes
        } else {
            // Filter locally from rawApiResults
            const localFiltered = rawApiResults.filter(game =>
                game.title.toLowerCase().includes(gameSearchInput.toLowerCase())
            );
            setFilteredDisplaySuggestions(localFiltered);
            setShowSuggestions(localFiltered.length > 0);
        }

        // If user types something different than selected game title, reset platform/price
        if (selectedGameForPrices && gameSearchInput !== selectedGameForPrices.title) {
            setSelectedGameForPrices(null);
            setPlatformPriceOptions([]);
            setPlatformInput("");
            setPriceDisplay("");
        }

    }, [gameSearchInput, activeApiQueryChar, rawApiResults, fetchInitialSuggestions, selectedGameForPrices]);


    const fetchPlatformPrices = async (game: Game) => {
        setLoadingPlatformPrices(true);
        setPlatformPriceOptions([]);
        setPlatformInput("");
        setPriceDisplay("");
        try {
            const response = await fetch(`/api/nexarda/prices?id=${game.game_info.id}`);
            if (!response.ok) throw new Error(`Failed to fetch platform prices (status: ${response.status})`);
            const data: NexardaPricesResponse = await response.json();

            const offers = data.prices?.list || [];
            const platformPricesMap = new Map<string, PlatformPriceOption>();

            offers.forEach(offer => {
                if (offer.available && offer.price > 0 && offer.platform?.slug && offer.platform?.name &&
                    !offer.edition_full?.toLowerCase().includes('demo') &&
                    !offer.edition_full?.toLowerCase().includes('trial')) {

                    const currentLowestForPlatform = platformPricesMap.get(offer.platform.slug);
                    if (!currentLowestForPlatform || offer.price < currentLowestForPlatform.price) {
                        platformPricesMap.set(offer.platform.slug, {
                            slug: offer.platform.slug,
                            name: offer.platform.name,
                            price: offer.price
                        });
                    }
                }
            });

            const pricedOptions = Array.from(platformPricesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

            if (pricedOptions.length > 0) {
                // Happy path: We have specific offers with prices
                setPlatformPriceOptions(pricedOptions);
                setPlatformInput(pricedOptions[0].slug);
                setPriceDisplay(pricedOptions[0].price!.toFixed(2));
            } else {
                // Fallback path: No specific offers, use general game info
                console.warn("No specific priced offers found. Using fallback platforms and lowest_price.");
                const fallbackPlatforms = (game.game_info.platforms || [])
                    .map(p => ({ slug: p.slug, name: p.name }))
                    .filter(p => p.name && p.slug);

                setPlatformPriceOptions(fallbackPlatforms);
                const lowestPrice = game.game_info.lowest_price;
                setPriceDisplay(lowestPrice > 0 ? lowestPrice.toFixed(2) : "N/A");
                setPlatformInput(""); // Force user to select a platform
            }

        } catch (error) {
            console.error("Error fetching platform prices, using fallback:", error);
            // General error fallback
            const fallbackPlatforms = (game.game_info.platforms || [])
                .map(p => ({ slug: p.slug, name: p.name }))
                .filter(p => p.name && p.slug);
            setPlatformPriceOptions(fallbackPlatforms);
            const lowestPrice = game.game_info.lowest_price;
            setPriceDisplay(lowestPrice > 0 ? lowestPrice.toFixed(2) : "N/A");
            setPlatformInput("");
        } finally {
            setLoadingPlatformPrices(false);
        }
    };

    const handleSuggestionClick = (game: Game) => {
        setGameSearchInput(game.title);
        setSelectedGameForPrices(game);
        setShowSuggestions(false);
        setFilteredDisplaySuggestions([]);
        fetchPlatformPrices(game);
    };

    const handlePlatformChange = (selectedSlug: string) => {
        setPlatformInput(selectedSlug);
        // Only update price if the selected option has a specific price
        const selectedOption = platformPriceOptions.find(p => p.slug === selectedSlug);
        if (selectedOption && selectedOption.price !== undefined) {
            setPriceDisplay(selectedOption.price.toFixed(2));
        }
        // Otherwise, keep the general lowest_price in priceDisplay
    };

    const handleAddGame = (e: FormEvent) => {
        e.preventDefault();
        const priceNum = parseFloat(priceDisplay);

        let platformNameToAdd = "";
        const selectedPlatformObj = platformPriceOptions.find(p => p.slug === platformInput);
        platformNameToAdd = selectedPlatformObj ? selectedPlatformObj.name : "N/A";

        if (gameSearchInput && platformNameToAdd !== "N/A" && !isNaN(priceNum) && priceNum >= 0) {
            setGamesInBudget([
                ...gamesInBudget,
                {
                    id: Date.now().toString(),
                    title: gameSearchInput,
                    platform: platformNameToAdd,
                    price: priceNum,
                },
            ]);
            // Reset form fields
            setGameSearchInput("");
            setPlatformInput("");
            setPriceDisplay("");
            setSelectedGameForPrices(null);
            setPlatformPriceOptions([]);
            setActiveApiQueryChar("");
            setRawApiResults([]);
        } else {
            alert("Please ensure Game Title is selected, a Platform is chosen, and Price is valid.");
        }
    };

    const handleRemoveGame = (id: string) => {
        setGamesInBudget(gamesInBudget.filter((game) => game.id !== id));
    };

    // Memoized calculations for summary
    const parsedBudget = useMemo(() => parseFloat(budget) || 0, [budget]);
    const parsedTaxRate = useMemo(() => parseFloat(taxRate) || 0, [taxRate]);
    const subtotal = useMemo(() => gamesInBudget.reduce((acc, game) => acc + game.price, 0), [gamesInBudget]);
    const taxAmount = useMemo(() => subtotal * (parsedTaxRate / 100), [subtotal, parsedTaxRate]);
    const totalCost = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);
    const remainingBudget = useMemo(() => parsedBudget - totalCost, [parsedBudget, totalCost]);

    return (
        <div className="budget-calculator-page main-content" onClick={() => { if (showSuggestions) setShowSuggestions(false); }}>
            <h1 className="budget-calculator-title">Budget Calculator</h1>

            {/* Budget Input Section */}
            <div className="calculator-section">
                <h2>Set Your Budget</h2>
                <div className="input-group">
                    <label htmlFor="budget-input">Budget Limit ($):</label>
                    <input id="budget-input" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g., 200" />
                </div>
            </div>

            {/* Add Game Section */}
            <div className="calculator-section">
                <h2>Add Games to Purchase</h2>
                <form onSubmit={handleAddGame} className="add-game-form">
                    <div className="input-group game-search-group">
                        <label htmlFor="game-title-search">Game Title:</label>
                        <input
                            id="game-title-search" type="text" value={gameSearchInput}
                            onChange={(e) => setGameSearchInput(e.target.value)}
                            onFocus={() => { if (filteredDisplaySuggestions.length > 0) setShowSuggestions(true); }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Type to search for game title..." autoComplete="off" required
                        />
                        {showSuggestions && (
                            <ul className="suggestions-dropdown" onClick={(e) => e.stopPropagation()}>
                                {loadingSuggestions && <li className="suggestion-item loading-item">Loading suggestions...</li>}
                                {!loadingSuggestions && filteredDisplaySuggestions.length > 0 && filteredDisplaySuggestions.map((game) => (
                                    <li key={game.game_info.id + "_" + game.title} className="suggestion-item" onClick={() => handleSuggestionClick(game)}>
                                        {game.title}
                                    </li>
                                ))}
                                {!loadingSuggestions && filteredDisplaySuggestions.length === 0 && gameSearchInput.length > 0 && activeApiQueryChar !== "" && (
                                    <li className="suggestion-item no-results-item">No results found for "{gameSearchInput}".</li>
                                )}
                            </ul>
                        )}
                    </div>

                    <div className="input-group">
                        <label htmlFor="game-platform">Platform:</label>
                        {selectedGameForPrices && platformPriceOptions.length > 0 ? (
                            <select
                                id="game-platform-select" className="platform-select-box"
                                value={platformInput}
                                onChange={(e) => handlePlatformChange(e.target.value)}
                                disabled={loadingPlatformPrices} required
                            >
                                <option value="" disabled>{loadingPlatformPrices ? "Loading platforms..." : "-- Select Platform --"}</option>
                                {platformPriceOptions.map(p => (
                                    <option key={p.slug} value={p.slug}>
                                        {p.name}{p.price !== undefined ? ` - $${p.price.toFixed(2)}` : ''}
                                    </option>
                                ))}
                            </select>
                        ) : selectedGameForPrices && loadingPlatformPrices ? (
                            <div className="platform-loading-display">Loading platform prices...</div>
                        ) : (
                            <input
                                id="game-platform-text" type="text"
                                placeholder={selectedGameForPrices ? "No platforms available" : "Select a game first"}
                                required readOnly
                            />
                        )}
                    </div>

                    <div className="input-group">
                        <label htmlFor="game-price-display">Price ($):</label>
                        <div id="game-price-display" className="price-display">
                            {priceDisplay ? (priceDisplay === "N/A" ? "N/A" : `$${priceDisplay}`) : (loadingPlatformPrices ? "Loading..." : "$0.00")}
                        </div>
                    </div>
                    <button type="submit" className="calc-button" disabled={loadingPlatformPrices || (selectedGameForPrices && !platformInput)}>
                        Add Game
                    </button>
                </form>
            </div>

            {/* Selected Games List */}
            {gamesInBudget.length > 0 && (
                <div className="calculator-section">
                    <h2>Selected Games</h2>
                    <ul className="games-list">
                        {gamesInBudget.map((game) => (
                            <li key={game.id} className="game-item">
                                <span>{game.title} ({game.platform}) - ${game.price.toFixed(2)}</span>
                                <button onClick={() => handleRemoveGame(game.id)} className="remove-game-btn">Remove</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Sales Tax Section */}
            <div className="calculator-section">
                <h2>Sales Tax</h2>
                <div className="input-group">
                    <label htmlFor="tax-rate-input">Sales Tax Rate (%):</label>
                    <input id="tax-rate-input" type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g., 7.5" step="0.01" min="0" />
                </div>
                <p className="info-text">Enter your local sales tax rate. For US ZIP codes, you may need to look this up.</p>
            </div>

            {/* Summary Section */}
            <div className="calculator-section summary-section">
                <h2>Summary</h2>
                <div className="summary-item"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="summary-item"><span>Tax ({parsedTaxRate > 0 ? parsedTaxRate.toFixed(2) : '0.00'}%):</span><span>${taxAmount.toFixed(2)}</span></div>
                <div className="summary-item total-cost"><span>Total Estimated Cost:</span><span>${totalCost.toFixed(2)}</span></div>
                <hr className="summary-divider" />
                {parsedBudget > 0 && (
                    <div className={`summary-item remaining-budget ${remainingBudget >= 0 ? 'positive' : 'negative'}`}>
                        <span>{remainingBudget >= 0 ? "Remaining Budget:" : "Amount Over Budget:"}</span>
                        <span>${Math.abs(remainingBudget).toFixed(2)}</span>
                    </div>
                )}
                {(!budget || parsedBudget === 0) && (<p className="info-text">Enter a budget to see how it compares to your total cost.</p>)}
            </div>
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <Link to="/" className="calc-button link-button">← Back to Home</Link>
            </div>
        </div>
    );
}

export default BudgetCalculatorPage;