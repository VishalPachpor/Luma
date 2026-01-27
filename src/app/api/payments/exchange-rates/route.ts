/**
 * Exchange Rates API
 * Fetches real-time cryptocurrency exchange rates from CoinGecko
 * Caches responses for 5 minutes to reduce API calls
 */

import { NextRequest, NextResponse } from 'next/server';

interface ExchangeRates {
	sol: number; // SOL price in USD
	eth: number; // ETH price in USD
	usdc: number; // USDC price in USD (should be ~1.00)
	timestamp: number;
}

// In-memory cache (in production, use Redis or similar)
let cache: ExchangeRates | null = null;
let cacheExpiry = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
	try {
		const now = Date.now();

		// Return cached data if still valid
		if (cache && now < cacheExpiry) {
			return NextResponse.json({
				success: true,
				rates: cache,
				cached: true
			});
		}

		// Fetch from CoinGecko API
		const response = await fetch(
			'https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum,usd-coin&vs_currencies=usd',
			{
				headers: {
					'Accept': 'application/json',
				},
				next: { revalidate: 300 } // Cache for 5 minutes at CDN level
			}
		);

		if (!response.ok) {
			throw new Error(`CoinGecko API error: ${response.status}`);
		}

		const data = await response.json();

		const rates: ExchangeRates = {
			sol: data.solana?.usd || 0,
			eth: data.ethereum?.usd || 0,
			usdc: data['usd-coin']?.usd || 1.0,
			timestamp: now
		};

		// Validate rates
		if (!rates.sol || !rates.eth) {
			throw new Error('Invalid exchange rate data received');
		}

		// Update cache
		cache = rates;
		cacheExpiry = now + CACHE_DURATION_MS;

		return NextResponse.json({
			success: true,
			rates,
			cached: false
		});

	} catch (error: any) {
		console.error('[ExchangeRates] Error:', error);

		// Fallback to hardcoded rates if API fails
		const fallbackRates: ExchangeRates = {
			sol: 200, // ~$200 per SOL (fallback)
			eth: 3000, // ~$3000 per ETH (fallback)
			usdc: 1.0,
			timestamp: Date.now()
		};

		return NextResponse.json({
			success: false,
			rates: fallbackRates,
			error: error.message,
			fallback: true
		}, { status: 200 }); // Still return 200 with fallback data
	}
}
