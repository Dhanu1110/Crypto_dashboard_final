// Portfolio Constants
export const PORTFOLIO_STORAGE_KEY = 'crypto-portfolio-holdings';
export const PORTFOLIO_SNAPSHOTS_KEY = 'crypto-portfolio-snapshots';

// Cache Configuration
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const PRICE_CACHE_TTL = 60 * 1000; // 1 minute
export const DATA_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
export const MAX_CACHE_SIZE = 100;

// API Configuration
export const MAX_CONCURRENT_REQUESTS = 2;
export const RETRY_ATTEMPTS = 2;
export const RETRY_DELAY = 1500;
export const MIN_REQUEST_INTERVAL = 800;
export const REQUEST_TIMEOUT = 10000;

// Portfolio Thresholds
export const HIGH_CONCENTRATION_THRESHOLD = 50;
export const MODERATE_CONCENTRATION_THRESHOLD = 30;
export const RECOMMENDED_MIN_HOLDINGS = 5;
export const MAX_SINGLE_HOLDING_PERCENTAGE = 40;

// Snapshot Configuration
export const SNAPSHOT_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_SNAPSHOTS = 90; // Keep 90 days of history
