import { useEffect, useState } from 'react';
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
    id: number | null;
    title: string;
    storeOffers: StoreOffer[];
    genre: string;
}

function WatchlistButton({ id, title, storeOffers, genre }: WatchlistButtonProps) {
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [getNotified, setGetNotified] = useState(true);
    const [selectedPlatform, setSelectedPlatform] = useState<string>('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const navigate = useNavigate();

    // Check if user is authenticated
    useEffect(() => {
        const checkAuth = () => {
            const user = localStorage.getItem('user') || sessionStorage.getItem('user');
            setIsAuthenticated(!!user);
            return !!user;
        };

        if (checkAuth()) {
            checkWatchlistStatus();
        }
    }, []);

    // Get valid platforms with prices (excluding demos and free trials)
    const getPlatformsWithPrices = () => {
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
    };

    // Set default platform if only one is available
    useEffect(() => {
        if (isAuthenticated && !isInWatchlist) {
            const platformPrices = getPlatformsWithPrices();
            if (platformPrices.size === 1) {
                setSelectedPlatform(Array.from(platformPrices.keys())[0]);
            }
        }
    }, [isAuthenticated, isInWatchlist]);

    const checkWatchlistStatus = async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            const response = await fetch(`/api/watchlist/check/${id}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized();
                    return;
                }
                throw new Error('Failed to check watchlist status');
            }

            const data = await response.json();
            setIsInWatchlist(data.isWatchlisted);
            setGetNotified(data.getNotified);
            if (data.platform) {
                setSelectedPlatform(data.platform);
            }
        } catch (err) {
            console.error('Error checking watchlist status:', err);
            setError('Failed to check watchlist status');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnauthorized = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        // Store current path before redirecting
        sessionStorage.setItem('returnTo', window.location.pathname);
        navigate('/login');
    };

    const getCurrentPrice = (): number => {
        const platformPrices = getPlatformsWithPrices();
        return platformPrices.get(selectedPlatform) || 0;
    };

    const handleWatchlistClick = () => {
        if (!isAuthenticated) {
            // Store current path before redirecting to login
            sessionStorage.setItem('returnTo', window.location.pathname);
            navigate('/login');
            return;
        }
        toggleWatchlist();
    };

    const toggleWatchlist = async () => {
        if (!id) {
            setError('Invalid game ID');
            return;
        }

        if (!selectedPlatform && getPlatformsWithPrices().size > 1) {
            setError('Please select a platform');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const endpoint = isInWatchlist
                ? `/api/watchlist/remove/${id}`
                : `/api/watchlist/add/${id}`;

            // Always send the full request body, even for remove
            const requestBody = {
                gameTitle: title,
                platform: selectedPlatform,
                currentPrice: getCurrentPrice(),
                genre: genre,
                getNotified: getNotified
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized();
                    return;
                }
                const data = await response.json();
                throw new Error(data.message || 'Failed to update watchlist');
            }

            setIsInWatchlist(!isInWatchlist);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update watchlist');
            console.error('Error updating watchlist:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleNotification = async () => {
        if (!id || !isInWatchlist || !isAuthenticated) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/watchlist/notify/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    getNotified: !getNotified,
                    platform: selectedPlatform
                }),
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    handleUnauthorized();
                    return;
                }
                const data = await response.json();
                throw new Error(data.message || 'Failed to update notification setting');
            }

            setGetNotified(!getNotified);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update notification setting');
            console.error('Error updating notification setting:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const platformPrices = getPlatformsWithPrices();

    return (
        <div className="watchlist-button-container">
            {isAuthenticated && platformPrices.size > 1 && !isInWatchlist && (
                <div className="platform-selector">
                    <select
                        value={selectedPlatform}
                        onChange={(e) => {
                            setSelectedPlatform(e.target.value);
                            setError(null);
                        }}
                        className="platform-select"
                        aria-label="Select Platform"
                    >
                        <option value="">Select Platform</option>
                        {Array.from(platformPrices.entries()).map(([platform, price]) => (
                            <option key={platform} value={platform}>
                                {platform} - ${price.toFixed(2)}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <button
                className={`watchlist-button ${isInWatchlist ? 'in-watchlist' : ''}`}
                onClick={handleWatchlistClick}
                disabled={
                    isLoading ||
                    !id ||
                    (!selectedPlatform && platformPrices.size > 1 && isAuthenticated)
                }
                aria-label={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
                {isLoading ? (
                    <span className="loading-spinner" aria-label="Loading"></span>
                ) : (
                    <>
                        <i className={`fas ${isInWatchlist ? 'fa-check' : 'fa-plus'}`} aria-hidden="true"></i>
                        {isAuthenticated
                            ? (isInWatchlist ? 'In Watchlist' : 'Add to Watchlist')
                            : 'Sign in to Add to Watchlist'}
                    </>
                )}
            </button>

            {isAuthenticated && isInWatchlist && (
                <div className="notification-toggle">
                    <label className="notification-label">
                        <input
                            type="checkbox"
                            checked={getNotified}
                            onChange={toggleNotification}
                            disabled={isLoading}
                            aria-label="Toggle Notifications"
                        />
                        <span className="notification-text">
                            {getNotified ? 'Notifications On' : 'Notifications Off'}
                        </span>
                    </label>
                </div>
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