// src/components/PriceHistoryChart.tsx

import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface PriceHistoryItem {
    id: number;
    gameId: number;
    price: number;
    recordedAt: string;
}

interface PriceHistoryStats {
    currentPrice: number;
    lowestPrice: number;
    highestPrice: number;
    averagePrice: number;
    priceChangesCount: number;
    latestChange: PriceHistoryItem | null;
}

interface PriceHistoryData {
    gameId: number;
    gameTitle: string;
    priceHistory: PriceHistoryItem[];
    stats: PriceHistoryStats;
}

interface PriceHistoryChartProps {
    gameId: number;
}

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ gameId }) => {
    const [priceData, setPriceData] = useState<PriceHistoryData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPriceHistory = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/price-history/stats/${gameId}`);

                if (!response.ok) {
                    throw new Error(`Error fetching price history: ${response.statusText}`);
                }

                const data = await response.json();
                setPriceData(data);
            } catch (err: any) {
                console.error('Error fetching price history:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (gameId) {
            fetchPriceHistory();
        }
    }, [gameId]);

    if (loading) {
        return <div className="loading-spinner">Loading price history...</div>;
    }

    if (error) {
        return <div className="error-message">Error: {error}</div>;
    }

    if (!priceData || !priceData.priceHistory.length) {
        return (
            <div className="price-history-chart empty-chart">
                <h3>Price History</h3>
                <p>No price history available yet. Check back later!</p>
            </div>
        );
    }

    // Format data for chart
    const dates = priceData.priceHistory.map(item => new Date(item.recordedAt).toLocaleDateString());
    const prices = priceData.priceHistory.map(item => item.price);

    const chartData = {
        labels: dates,
        datasets: [
            {
                label: 'Price History',
                data: prices,
                fill: false,
                backgroundColor: '#4472CA',
                borderColor: '#F79256',
                tension: 0.1
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Price History',
                color: 'white'
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        return `$${context.raw.toFixed(2)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: 'white'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            y: {
                ticks: {
                    color: 'white',
                    callback: function (value: any) {
                        return '$' + value;
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            }
        }
    };

    const stats = priceData.stats;

    return (
        <div className="price-history-chart">
            <h3>Price History</h3>
            <div className="chart-container">
                <Line data={chartData} options={chartOptions} />
            </div>
            <div className="price-stats">
                <div className="stat">
                    <span>Current: </span>
                    <span className="price">${stats.currentPrice.toFixed(2)}</span>
                </div>
                <div className="stat">
                    <span>Lowest: </span>
                    <span className="price">${stats.lowestPrice.toFixed(2)}</span>
                </div>
                <div className="stat">
                    <span>Highest: </span>
                    <span className="price">${stats.highestPrice.toFixed(2)}</span>
                </div>
                <div className="stat">
                    <span>Average: </span>
                    <span className="price">${stats.averagePrice.toFixed(2)}</span>
                </div>
                {stats.latestChange && (
                    <div className="stat last-change">
                        <span>Last changed: </span>
                        <span className="date">{new Date(stats.latestChange.recordedAt).toLocaleDateString()}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceHistoryChart;
