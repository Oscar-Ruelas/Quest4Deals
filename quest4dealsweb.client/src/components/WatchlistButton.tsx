import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styling/WatchlistButton.css';

interface StoreOffer {
    url: string;
    store: {
        name: string;
        image: string;
    };
    edition: string;
    price: number;
    platform?: string;
}

interface WatchlistButtonProps {
    id: number | null; // ExternalGameId
    title: string;
    storeOffers: StoreOffer[];
    genre: string;
}

type NotificationType = "AnyChange" | "Threshold" | "";

function WatchlistButton({ id, title, storeOffers, genre }: WatchlistButtonProps) {
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Notification States
    const [getNotified, setGetNotified] = useState(true);
    const [notificationType, setNotificationType] = useState<NotificationType>("AnyChange");
    const [priceThreshold, setPriceThreshold] = useState<string>(""); // Store as string for input field

    const [selectedPlatform, setSelectedPlatform] = useState<string>('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const navigate = useNavigate();

    const getPlatformsWithPrices = useCallback(() => {
        const platformPrices = new Map<string, number>();
        storeOffers.forEach(offer => {
            if (
                offer.price > 0 &&
                offer.platform &&
                !offer.edition.toLowerCase().includes('demo') &&
                !offer.edition.toLowerCase().includes('trial')
            ) {
                const currentPrice = platformPrices.get(offer.platform);
                if (!currentPrice || offer.price < currentPrice) {
                    platformPrices.set(offer.platform, offer.price);
                }
            }
        });
        return platformPrices;
    }, [storeOffers]);

    const checkWatchlistStatus = useCallback(async (platformToCheck: string) => {
        if (!id || !platformToCheck) return;
        try {
            setIsLoading(true);
            const response = await fetch(`/api/watchlist/check/${id}?platform=${encodeURIComponent(platformToCheck)}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized(); return;
                }
                // If 404 or other error, it might mean not watchlisted for this platform
                setIsInWatchlist(false);
                setGetNotified(true);
                setNotificationType("AnyChange");
                setPriceThreshold("");
                // throw new Error('Failed to check watchlist status');
                return;
            }

            const data = await response.json();
            setIsInWatchlist(data.isWatchlisted);
            if (data.isWatchlisted) {
                setGetNotified(data.getNotified ?? true);
                setNotificationType(data.notificationType ?? "AnyChange");
                setPriceThreshold(data.priceThreshold?.toString() ?? "");
                setSelectedPlatform(data.platform); // ensure selectedPlatform is set if watchlisted
            } else {
                // Reset to defaults if not watchlisted for this specific platform
                setGetNotified(true);
                setNotificationType("AnyChange");
                setPriceThreshold("");
            }
        } catch (err) {
            console.error('Error checking watchlist status:', err);
            setError('Failed to check watchlist status. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const user = localStorage.getItem('user') || sessionStorage.getItem('user');
        setIsAuthenticated(!!user);

        const platformPrices = getPlatformsWithPrices();
        if (platformPrices.size === 1 && !selectedPlatform) {
            const singlePlatform = Array.from(platformPrices.keys())[0];
            setSelectedPlatform(singlePlatform);
            if (user && id) checkWatchlistStatus(singlePlatform);
        } else if (selectedPlatform && user && id) {
            checkWatchlistStatus(selectedPlatform);
        } else if (!selectedPlatform && platformPrices.size > 0 && !isInWatchlist) {
            // If multiple platforms and not in watchlist, prompt selection but don't auto-select.
            // User needs to pick a platform first.
        }


    }, [getPlatformsWithPrices, selectedPlatform, checkWatchlistStatus, id, isInWatchlist]);


    const handleUnauthorized = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
        navigate('/login');
    };

    const getCurrentPriceForSelectedPlatform = (): number => {
        const platformPrices = getPlatformsWithPrices();
        return platformPrices.get(selectedPlatform) || 0;
    };

    const handlePrimaryAction = async () => {
        if (!isAuthenticated) {
            sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
            navigate('/login');
            return;
        }

        if (!id) { setError('Invalid game ID'); return; }
        if (!selectedPlatform) { setError('Please select a platform.'); return; }

        setIsLoading(true);
        setError(null);

        const requestBody = {
            gameTitle: title,
            platform: selectedPlatform,
            currentPrice: getCurrentPriceForSelectedPlatform(),
            genre: genre,
            getNotified: getNotified,
            notificationType: notificationType,
            priceThreshold: notificationType === "Threshold" && priceThreshold ? parseFloat(priceThreshold) : null,
        };

        try {
            let endpoint = '';
            let method = '';

            if (isInWatchlist) { // If in watchlist, we are updating settings or removing
                // For this example, let's make "Add/Remove" the primary, and settings a secondary.
                // Or, if primary button means "Update Settings" when in watchlist:
                endpoint = `/api/watchlist/settings/${id}`;
                method = 'PUT';
            } else { // Not in watchlist, so add it
                endpoint = `/api/watchlist/add/${id}`;
                method = 'POST';
            }

            // This logic needs to be split: one for add/remove, one for updating settings.
            // Let's assume the main button toggles add/remove.
            // A separate "Save Settings" button would call the PUT endpoint.

            if (isInWatchlist) { // Action: Remove from Watchlist
                endpoint = `/api/watchlist/remove/${id}`; // Needs platform in body too
                method = 'POST'; // Or DELETE, ensure backend matches
            } else { // Action: Add to Watchlist
                endpoint = `/api/watchlist/add/${id}`;
                method = 'POST';
            }


            const response = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody), // remove needs platform, add needs all
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 401) { handleUnauthorized(); return; }
                const data = await response.json();
                throw new Error(data.message || `Failed to ${isInWatchlist ? 'remove from' : 'add to'} watchlist`);
            }

            setIsInWatchlist(!isInWatchlist);
            if (!isInWatchlist) { // If it was just added
                // Keep current settings, or fetch them if add returns new state
            } else { // If it was just removed, reset UI for adding again
                setGetNotified(true);
                setNotificationType("AnyChange");
                setPriceThreshold("");
            }
            setError(null);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update watchlist');
            console.error('Error toggling watchlist:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!isAuthenticated || !isInWatchlist || !id || !selectedPlatform) return;
        setIsLoading(true);
        setError(null);

        const thresholdValue = notificationType === "Threshold" && priceThreshold ? parseFloat(priceThreshold) : null;
        if (notificationType === "Threshold" && (thresholdValue === null || isNaN(thresholdValue) || thresholdValue < 0)) {
            setError("Please enter a valid price for the threshold.");
            setIsLoading(false);
            return;
        }


        try {
            const response = await fetch(`/api/watchlist/settings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameTitle: title, // Though not strictly needed for update by ID, good practice
                    platform: selectedPlatform,
                    genre: genre, // Same as above
                    currentPrice: getCurrentPriceForSelectedPlatform(), // Same
                    getNotified: getNotified,
                    notificationType: notificationType,
                    priceThreshold: thresholdValue,
                }),
                credentials: 'include',
            });
            if (!response.ok) {
                if (response.status === 401) { handleUnauthorized(); return; }
                const data = await response.json();
                throw new Error(data.message || 'Failed to update notification settings');
            }
            setError(null); // Clear previous errors on success
            // Optionally show a success message briefly
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update settings');
            console.error('Error saving notification settings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const platformPrices = getPlatformsWithPrices();

    if (!id) return <p>Game ID not available.</p>;

    return (
        <div className="watchlist-button-container">
            {isAuthenticated && platformPrices.size > 1 && !selectedPlatform && (
                <p className="info-message">Select a platform to manage watchlist.</p>
            )}
            {platformPrices.size > 0 && (
                <div className="platform-selector">
                    <label htmlFor="platform-select">Platform: </label>
                    <select
                        id="platform-select"
                        value={selectedPlatform}
                        onChange={(e) => {
                            const newPlatform = e.target.value;
                            setSelectedPlatform(newPlatform);
                            setError(null);
                            if (isAuthenticated && id && newPlatform) {
                                checkWatchlistStatus(newPlatform); // Check status for newly selected platform
                            } else {
                                // Reset if platform is deselected or user not auth
                                setIsInWatchlist(false);
                                setGetNotified(true);
                                setNotificationType("AnyChange");
                                setPriceThreshold("");
                            }
                        }}
                        className="platform-select"
                        aria-label="Select Platform"
                    >
                        <option value="">-- Select Platform --</option>
                        {Array.from(platformPrices.entries()).map(([platform, price]) => (
                            <option key={platform} value={platform}>
                                {platform} - ${price.toFixed(2)}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            {platformPrices.size === 0 && <p>No purchasable offers found for this game.</p>}


            {selectedPlatform && ( // Only show add/remove and settings if a platform is chosen
                <>
                    <button
                        className={`watchlist-button ${isInWatchlist ? 'in-watchlist' : ''}`}
                        onClick={handlePrimaryAction}
                        disabled={isLoading || !id || !selectedPlatform}
                        aria-label={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    >
                        {isLoading ? (
                            <span className="loading-spinner" aria-label="Loading"></span>
                        ) : (
                            <>
                                <i className={`fas ${isInWatchlist ? 'fa-check' : 'fa-plus'}`} aria-hidden="true"></i>
                                {isAuthenticated
                                    ? (isInWatchlist ? `Remove From Watchlist (${selectedPlatform})` : `Add to Watchlist (${selectedPlatform})`)
                                    : 'Sign in to Add to Watchlist'}
                            </>
                        )}
                    </button>

                    {isAuthenticated && isInWatchlist && (
                        <div className="notification-settings">
                            <h4>Notification Preferences for {selectedPlatform}:</h4>
                            <div className="notification-toggle">
                                <label className="notification-label">
                                    <input
                                        type="checkbox"
                                        checked={getNotified}
                                        onChange={() => setGetNotified(!getNotified)}
                                        disabled={isLoading}
                                        aria-label="Toggle General Notifications"
                                    />
                                    <span className="notification-text">
                                        {getNotified ? 'Receive Notifications' : 'Notifications Off'}
                                    </span>
                                </label>
                            </div>

                            {getNotified && ( // Only show type/threshold if general notifications are on
                                <>
                                    <div className="notification-type-selector">
                                        <label htmlFor="notification-type">Notify me on: </label>
                                        <select
                                            id="notification-type"
                                            value={notificationType}
                                            onChange={(e) => setNotificationType(e.target.value as NotificationType)}
                                            disabled={isLoading}
                                        >
                                            <option value="AnyChange">Any Price Change</option>
                                            <option value="Threshold">Price Drops To/Below Threshold</option>
                                        </select>
                                    </div>

                                    {notificationType === "Threshold" && (
                                        <div className="price-threshold-input">
                                            <label htmlFor="price-threshold">Price Threshold ($): </label>
                                            <input
                                                type="number"
                                                id="price-threshold"
                                                value={priceThreshold}
                                                onChange={(e) => setPriceThreshold(e.target.value)}
                                                placeholder="e.g., 19.99"
                                                min="0"
                                                step="0.01"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            <button onClick={handleSaveSettings} disabled={isLoading} className="save-settings-button">
                                {isLoading ? "Saving..." : "Save Settings"}
                            </button>
                        </div>
                    )}
                </>
            )}

            {error && (
                <div className="error-message" role="alert">
                    {error}
                </div>
            )}
        </div>
    );
}

export default WatchlistButton;