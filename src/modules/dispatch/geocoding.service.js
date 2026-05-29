'use strict';

const axios = require('axios');
const logger = require('../../config/logger');
const config = require('../../config');

// ═══════════════════════════════════════════════════════════════════════════════
// OLA MAPS GEOCODING SERVICE
//
// Converts human-readable addresses into GeoJSON Point coordinates.
// Uses Ola Maps Geocoding API with fallback to OpenStreetMap Nominatim.
//
// Rate limiting: Ola Maps free tier allows 500K calls/month.
// We implement a simple in-memory cache to avoid redundant calls.
// ═══════════════════════════════════════════════════════════════════════════════

const OLA_GEOCODE_URL = 'https://api.olamaps.io/places/v1/geocode';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Simple LRU-style cache (address → coordinates)
const geocodeCache = new Map();
const CACHE_MAX_SIZE = 2000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Geocode a plain-text address into [longitude, latitude] coordinates.
 *
 * Strategy:
 *  1. Check in-memory cache
 *  2. Try Ola Maps Geocoding API (if API key configured)
 *  3. Fallback to OpenStreetMap Nominatim (free, no key required)
 *
 * @param {string} addressText - Human-readable address string
 * @returns {Promise<{lng: number, lat: number, source: string}>}
 * @throws {Error} If geocoding fails completely
 *
 * Complexity: O(1) cache hit, O(network) on miss
 */
async function geocodeAddress(addressText) {
  if (!addressText || typeof addressText !== 'string') {
    throw new Error('geocodeAddress: addressText is required and must be a string.');
  }

  const cacheKey = addressText.trim().toLowerCase();

  // 1. Cache lookup
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { lng: cached.lng, lat: cached.lat, source: 'cache' };
  }

  // 2. Try Ola Maps Geocoding API
  const olaApiKey = config.maps?.googleApiKey || process.env.OLA_MAPS_API_KEY || process.env.VITE_OLAMAPS_API_KEY || '';
  if (olaApiKey && olaApiKey.trim() !== '') {
    try {
      const response = await axios.get(OLA_GEOCODE_URL, {
        params: {
          address: addressText,
          api_key: olaApiKey,
        },
        timeout: 8000,
      });

      const results = response.data?.geocodingResults;
      if (results && results.length > 0) {
        const { lat, lng } = results[0].geometry.location;
        setCacheEntry(cacheKey, lng, lat);
        logger.debug(`Geocoded via Ola Maps: "${addressText}" → [${lng}, ${lat}]`);
        return { lng, lat, source: 'ola_maps' };
      }
    } catch (err) {
      logger.warn(`Ola Maps geocoding failed for "${addressText}": ${err.message}. Falling back to Nominatim.`);
    }
  }

  // 3. Fallback: OpenStreetMap Nominatim
  try {
    const response = await axios.get(NOMINATIM_URL, {
      params: {
        q: addressText,
        format: 'json',
        limit: 1,
        countrycodes: 'in', // Restrict to India
      },
      headers: {
        'User-Agent': 'CylDist-Platform/1.0 (delivery-routing)',
      },
      timeout: 10000,
    });

    if (response.data && response.data.length > 0) {
      const { lon, lat } = response.data[0];
      const lng = parseFloat(lon);
      const latNum = parseFloat(lat);
      setCacheEntry(cacheKey, lng, latNum);
      logger.debug(`Geocoded via Nominatim: "${addressText}" → [${lng}, ${latNum}]`);
      return { lng, lat: latNum, source: 'nominatim' };
    }
  } catch (err) {
    logger.error(`Nominatim geocoding failed for "${addressText}": ${err.message}`);
  }

  throw new Error(`Failed to geocode address: "${addressText}". No provider returned results.`);
}

/**
 * Batch geocode multiple addresses with concurrency control.
 * Respects rate limits by processing in sequential batches.
 *
 * @param {Array<{id: string, address: string}>} items
 * @param {number} concurrency - Max parallel requests (default: 3)
 * @returns {Promise<Array<{id: string, lng: number, lat: number, source: string}>>}
 *
 * Complexity: O(n) where n = number of addresses
 */
async function batchGeocode(items, concurrency = 3) {
  const results = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        const coords = await geocodeAddress(item.address);
        return { id: item.id, ...coords };
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        logger.warn(`Batch geocode failed for item: ${result.reason.message}`);
        results.push({ id: batch[results.length]?.id, lng: null, lat: null, source: 'failed' });
      }
    }

    // Small delay between batches to respect rate limits
    if (i + concurrency < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

// ── Cache Helpers ──

function setCacheEntry(key, lng, lat) {
  if (geocodeCache.size >= CACHE_MAX_SIZE) {
    // Evict oldest entry
    const firstKey = geocodeCache.keys().next().value;
    geocodeCache.delete(firstKey);
  }
  geocodeCache.set(key, { lng, lat, timestamp: Date.now() });
}

function clearGeocodeCache() {
  geocodeCache.clear();
}

module.exports = { geocodeAddress, batchGeocode, clearGeocodeCache };
