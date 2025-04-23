import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styling/WatchlistButton.css';

interface WatchlistButtonProps {
    id: number | null;
    title: string;
    platform: string;
    currentPrice: number | null;
    genre: string;  // Add genre prop
}

function WatchlistButton({ id, title, platform, currentPrice, genre }: WatchlistButtonProps) {
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [getNotified, setGetNotified] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        checkWatchlistStatus();
    }, [id]);

    const checkWatchlistStatus = async () => {
        if (!id) return;

        try {
            const response = await fetch(`/api/watchlist/check/${id}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setIsInWatchlist(data.isWatchlisted);
                setGetNotified(data.getNotified);
            } else if (response.status === 401) {
                navigate('/login');
            }
        } catch (err) {
            console.error('Error checking watchlist status:', err);
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
                    genre: genre,  // Add genre
                    getNotified: getNotified,
                }),
                credentials: 'include',
            });

            if (response.ok) {
                setIsInWatchlist(!isInWatchlist);
            } else if (response.status === 401) {
                navigate('/login');
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to update watchlist');
            }
        } catch (err) {
            setError('Failed to update watchlist');
            console.error('Error updating watchlist:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleNotification = async () => {
        if (!id || !isInWatchlist) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/watchlist/notify/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(!getNotified),
                credentials: 'include',
            });

            if (response.ok) {
                setGetNotified(!getNotified);
            } else if (response.status === 401) {
                navigate('/login');
            } else {
                const data = await response.json();
                setError(data.message || 'Failed to update notification setting');
            }
        } catch (err) {
            setError('Failed to update notification setting');
            console.error('Error updating notification setting:', err);
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
                    <span className="loading-spinner"></span>
                ) : (
                    <>
                        <i className={`fas ${isInWatchlist ? 'fa-check' : 'fa-plus'}`}></i>
                        {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    </>
                )}
            </button>

            {isInWatchlist && (
                <div className="notification-toggle">
                    <label className="notification-label">
                        <input
                            type="checkbox"
                            checked={getNotified}
                            onChange={toggleNotification}
                            disabled={isLoading}
                        />
                        <span className="notification-text">
                            {getNotified ? 'Notifications On' : 'Notifications Off'}
                        </span>
                    </label>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}
        </div>
    );
}

export default WatchlistButton;