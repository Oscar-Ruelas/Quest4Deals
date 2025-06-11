// src/pages/BudgetCalculatorPage.tsx
import { useState, useMemo, FormEvent, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "../styling/BudgetCalculatorPage.css";
import { Game } from "../components/Gamecard";

// --- Helper Interfaces ---

interface BudgetGameEntry {
    id: string;
    title: string;
    platform: string;
    price: number;
}

interface PlatformPriceOption {
    name: string;
    price: number;
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

// --- Platform Normalization Logic (Crucial for fixing the bug) ---
const normalizePlatformName = (offer: NexardaPriceOffer): string => {
    let platformName = offer.platform?.name || offer.platform?.slug || "";

    // Fallback logic to find platform name in the edition string
    if (!platformName && offer.edition_full) {
        const match = offer.edition_full.match(/FOR:(.+)$/i);
        if (match) platformName = match[1].trim();
    }

    if (!platformName) return "Unknown";

    const lowerName = platformName.toLowerCase().trim();

    // Group various PC store names into a single "WINDOWS" category
    if (['pc', 'windows', 'steam', 'epic games', 'gog', 'ea app', 'ea desktop app', 'epic games launcher', 'ubisoft connect', 'battle.net'].some(pcName => lowerName.includes(pcName))) {
        return 'WINDOWS';
    }
    if (lowerName.includes('ps5') || lowerName.includes('playstation 5')) return 'PS5';
    if (lowerName.includes('ps4') || lowerName.includes('playstation 4')) return 'PS4';
    if (lowerName.includes('xbox series x') || lowerName.includes('xbox series s') || lowerName.includes('xbox-xs')) return 'XBOX-XS';
    if (lowerName.includes('xbox one') || lowerName.includes('xboxone')) return 'Xbox One';
    if (lowerName.includes('switch') || lowerName.includes('nintendo switch')) return 'Nintendo Switch';
    if (lowerName.includes('playstation')) return 'PlayStation'; // Broader fallback
    if (lowerName.includes('xbox')) return 'Xbox'; // Broader fallback

    // Default case to capitalize the first letter
    return platformName.charAt(0).toUpperCase() + platformName.slice(1);
};


function BudgetCalculatorPage() {
    // --- State Hooks ---
    const [budget, setBudget] = useState<string>("");
    const [gamesInBudget, setGamesInBudget] = useState<BudgetGameEntry[]>([]);
    const [taxRate, setTaxRate] = useState<string>("");

    const [gameSearchInput, setGameSearchInput] = useState<string>("");
    const [platformInput, setPlatformInput] = useState<string>("");
    const [priceDisplay, setPriceDisplay] = useState<string>("");

    const [activeApiQueryChar, setActiveApiQueryChar] = useState<string>("");
    const [rawApiResults, setRawApiResults] = useState<Game[]>([]);
    const [filteredDisplaySuggestions, setFilteredDisplaySuggestions] = useState<Game[]>([]);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);

    const [selectedGameForPrices, setSelectedGameForPrices] = useState<Game | null>(null);
    const [platformPriceOptions, setPlatformPriceOptions] = useState<PlatformPriceOption[]>([]);
    const [loadingPlatformPrices, setLoadingPlatformPrices] = useState<boolean>(false);

    // --- Data Fetching & Processing ---

    const fetchInitialSuggestions = useCallback(async (queryChar: string) => {
        if (!queryChar) return;
        setLoadingSuggestions(true);
        setActiveApiQueryChar(queryChar);
        setRawApiResults([]);
        setFilteredDisplaySuggestions([]);
        try {
            const response = await fetch(`/api/nexarda/search?query=${encodeURIComponent(queryChar)}&limit=30`);
            if (!response.ok) throw new Error("Failed to fetch initial suggestions");
            const data = await response.json();
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            const newRawResults = parsed.results?.items || [];
            setRawApiResults(newRawResults);
            setFilteredDisplaySuggestions(newRawResults.filter(game => game.title.toLowerCase().startsWith(queryChar.toLowerCase())));
            setShowSuggestions(true);
        } catch (error) {
            console.error("Error fetching initial game suggestions:", error);
        } finally {
            setLoadingSuggestions(false);
        }
    }, []);

    const fetchAndProcessPlatformPrices = async (game: Game) => {
        setLoadingPlatformPrices(true);
        setPlatformPriceOptions([]);
        setPlatformInput("");
        setPriceDisplay("");
        try {
            const response = await fetch(`/api/nexarda/prices?id=${game.game_info.id}`);
            if (!response.ok) throw new Error(`Failed to fetch platform prices, status: ${response.status}`);

            const data: NexardaPricesResponse = await response.json();
            const offers = data.prices?.list || [];

            // Use a Map to store the lowest price found for each *normalized* platform name
            const platformPricesMap = new Map<string, number>();

            offers.forEach(offer => {
                if (offer.available && offer.price > 0 &&
                    !offer.edition_full?.toLowerCase().includes('demo') &&
                    !offer.edition_full?.toLowerCase().includes('trial')) {

                    const normalizedName = normalizePlatformName(offer);
                    if (normalizedName === "Unknown") return; // Skip offers we can't identify

                    const currentLowestForPlatform = platformPricesMap.get(normalizedName);

                    // If we haven't seen this platform yet, or if the new offer is cheaper, update the price
                    if (currentLowestForPlatform === undefined || offer.price < currentLowestForPlatform) {
                        platformPricesMap.set(normalizedName, offer.price);
                    }
                }
            });

            // Convert the map of lowest prices into the array structure needed for the dropdown
            const pricedOptions: PlatformPriceOption[] = Array.from(platformPricesMap, ([name, price]) => ({ name, price }))
                .sort((a, b) => a.name.localeCompare(b.name));

            setPlatformPriceOptions(pricedOptions);

            if (pricedOptions.length === 1) {
                handlePlatformChange(pricedOptions[0].name);
            }

        } catch (error) {
            console.error("A network or other error occurred while fetching prices.", error);
        } finally {
            setLoadingPlatformPrices(false);
        }
    };

    // --- Component Effects & Event Handlers ---

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
            fetchInitialSuggestions(firstChar);
        } else {
            const localFiltered = rawApiResults.filter(game =>
                game.title.toLowerCase().includes(gameSearchInput.toLowerCase())
            );
            setFilteredDisplaySuggestions(localFiltered);
            setShowSuggestions(true);
        }

        if (selectedGameForPrices && gameSearchInput !== selectedGameForPrices.title) {
            setSelectedGameForPrices(null);
            setPlatformPriceOptions([]);
            setPlatformInput("");
            setPriceDisplay("");
        }
    }, [gameSearchInput, activeApiQueryChar, rawApiResults, fetchInitialSuggestions, selectedGameForPrices]);

    const handleSuggestionClick = (game: Game) => {
        setGameSearchInput(game.title);
        setSelectedGameForPrices(game);
        setShowSuggestions(false);
        fetchAndProcessPlatformPrices(game);
    };

    const handlePlatformChange = (selectedPlatformName: string) => {
        setPlatformInput(selectedPlatformName);
        const selectedOption = platformPriceOptions.find(p => p.name === selectedPlatformName);
        if (selectedOption) {
            setPriceDisplay(selectedOption.price.toFixed(2));
        }
    };

    const handleAddGame = (e: FormEvent) => {
        e.preventDefault();
        const priceNum = parseFloat(priceDisplay);

        if (gameSearchInput && platformInput && !isNaN(priceNum) && priceNum >= 0) {
            setGamesInBudget(prev => [...prev, {
                id: Date.now().toString(),
                title: gameSearchInput,
                platform: platformInput,
                price: priceNum,
            }]);
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
        setGamesInBudget(gamesInBudget.filter(game => game.id !== id));
    };

    // --- Memoized Summary Calculations ---
    const { subtotal, taxAmount, totalCost, remainingBudget } = useMemo(() => {
        const parsedBudget = parseFloat(budget) || 0;
        const parsedTaxRate = parseFloat(taxRate) || 0;
        const sub = gamesInBudget.reduce((acc, game) => acc + game.price, 0);
        const tax = sub * (parsedTaxRate / 100);
        const total = sub + tax;
        const remaining = parsedBudget - total;
        return { subtotal: sub, taxAmount: tax, totalCost: total, remainingBudget: remaining };
    }, [gamesInBudget, budget, taxRate]);

    return (
        <div className="budget-calculator-page main-content" onClick={() => setShowSuggestions(false)}>
            <h1 className="budget-calculator-title">Budget Calculator</h1>

            <div className="calculator-section">
                <h2>Set Your Budget</h2>
                <div className="input-group">
                    <label htmlFor="budget-input">Budget Limit ($):</label>
                    <input id="budget-input" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g., 200" />
                </div>
            </div>

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
                                {!loadingSuggestions && filteredDisplaySuggestions.length === 0 && gameSearchInput.length > 0 && (
                                    <li className="suggestion-item no-results-item">No results found for "{gameSearchInput}".</li>
                                )}
                            </ul>
                        )}
                    </div>

                    <div className="input-group">
                        <label htmlFor="game-platform">Platform:</label>
                        <select
                            id="game-platform-select" className="platform-select-box"
                            value={platformInput}
                            onChange={(e) => handlePlatformChange(e.target.value)}
                            disabled={loadingPlatformPrices || !selectedGameForPrices}
                            required
                        >
                            <option value="" disabled>
                                {loadingPlatformPrices ? "Loading platforms..." : (selectedGameForPrices ? (platformPriceOptions.length > 0 ? "-- Select Platform --" : "No offers found") : "Select a game first")}
                            </option>
                            {platformPriceOptions.map(p => (
                                <option key={p.name} value={p.name}>
                                    {p.name} - ${p.price.toFixed(2)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="input-group">
                        <label htmlFor="game-price-display">Price ($):</label>
                        <div id="game-price-display" className="price-display">
                            {priceDisplay ? `$${priceDisplay}` : (loadingPlatformPrices ? "Loading..." : "Select platform")}
                        </div>
                    </div>
                    <button type="submit" className="calc-button" disabled={!platformInput || !priceDisplay || isNaN(parseFloat(priceDisplay))}>
                        Add Game
                    </button>
                </form>
            </div>

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

            <div className="calculator-section">
                <h2>Sales Tax</h2>
                <div className="input-group">
                    <label htmlFor="tax-rate-input">Sales Tax Rate (%):</label>
                    <input id="tax-rate-input" type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g., 7.5" step="0.01" min="0" />
                </div>
            </div>

            <div className="calculator-section summary-section">
                <h2>Summary</h2>
                <div className="summary-item"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="summary-item"><span>Tax ({(parseFloat(taxRate) || 0).toFixed(2)}%):</span><span>${taxAmount.toFixed(2)}</span></div>
                <div className="summary-item total-cost"><span>Total Estimated Cost:</span><span>${totalCost.toFixed(2)}</span></div>
                <hr className="summary-divider" />
                {budget && parseFloat(budget) > 0 && (
                    <div className={`summary-item remaining-budget ${remainingBudget >= 0 ? 'positive' : 'negative'}`}>
                        <span>{remainingBudget >= 0 ? "Remaining Budget:" : "Amount Over Budget:"}</span>
                        <span>${Math.abs(remainingBudget).toFixed(2)}</span>
                    </div>
                )}
                {(!budget || parseFloat(budget) === 0) && (<p className="info-text">Enter a budget to see how it compares to your total cost.</p>)}
            </div>
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <Link to="/" className="calc-button link-button">← Back to Home</Link>
            </div>
        </div>
    );
}

export default BudgetCalculatorPage;