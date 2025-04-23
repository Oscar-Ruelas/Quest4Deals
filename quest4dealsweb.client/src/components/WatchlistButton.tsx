// src/components/WatchlistButton.tsx
import { useState, useEffect } from 'react';
import '../styling/WatchlistButton.css';

interface WatchlistButtonProps {
    id: number | null;
    title: string;
    platform: string;
    currentPrice: number | null;
}

function WatchlistButton({ id, title, platform, currentPrice }: WatchlistButtonProps) {
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            checkWatchlistStatus();
        }
    }, [id]);

    const checkWatchlistStatus = async () => {
        if (!id) return;

        try {
            const response = await fetch(`/api/watchlist/check/${id}`);

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Please log in to use the watchlist');
                    return;
                }
                throw new Error('Failed to check watchlist status');
            }

            const data = await response.json();
            setIsInWatchlist(data.isWatchlisted);
        } catch (error) {
            console.error('Error checking watchlist status:', error);
            setError('Failed to check watchlist status');
        }
    };

    const toggleWatchlist = async () => {
        if (!id) return;

        setIsLoading(true);
        setError(null);

        try {
            const endpoint = isInWatchlist
                ? `/api/watchlist/remove/${id}`
                : `/api/watchlist/add/${id}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gameTitle: title,
                    platform: platform,
                    currentPrice: currentPrice || 0,
                }),
                credentials: 'include', // Important for authentication
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Please log in to use the watchlist');
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update watchlist');
            }

            setIsInWatchlist(!isInWatchlist);
        } catch (error) {
            console.error('Error updating watchlist:', error);
            setError(error instanceof Error ? error.message : 'Failed to update watchlist');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="watchlist-button-container">
            <button
                className={`watchlist-button ${isInWatchlist ? 'in-watchlist' : ''}`}
                onClick={toggleWatchlist}
                disabled={isLoading || !id}
            >
                {isLoading ? (
                    <span className="loading-spinner">...</span>
                ) : (
                    <>
                        {isInWatchlist ? '★ Remove from Watchlist' : '☆ Add to Watchlist'}
                    </>
                )}
            </button>
            {error && (
                <div className="watchlist-error">
                    {error}
                    {error !== 'Please log in to use the watchlist' && (
                        <button
                            className="retry-button"
                            onClick={() => {
                                setError(null);
                                checkWatchlistStatus();
                            }}
                        >
                            Retry
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default WatchlistButton;