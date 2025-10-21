"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;
function checkRateLimit(clientIP) {
    const now = Date.now();
    const clientData = rateLimitStore.get(clientIP);
    if (!clientData || now > clientData.resetTime) {
        rateLimitStore.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }
    if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }
    clientData.count++;
    return true;
}
const handler = async (event, _context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json',
    };
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
    try {
        // Rate limiting
        const clientIP = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
        if (!checkRateLimit(clientIP)) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            };
        }
        // Validate query parameters
        const { lat, lon } = event.queryStringParameters || {};
        if (!lat || !lon) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required parameters: lat, lon' }),
            };
        }
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        if (isNaN(latitude) || isNaN(longitude)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid latitude or longitude values' }),
            };
        }
        // Validate coordinate ranges
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Coordinates out of valid range' }),
            };
        }
        // Get API key from environment
        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey) {
            console.error('No API key found in environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Weather service configuration error - API key not found',
                    details: 'Please set OPENWEATHER_API_KEY in Netlify environment variables'
                }),
            };
        }
        // Try One Call API 3.0 first, fall back to free tier if needed
        const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial&exclude=minutely,hourly,alerts`;
        const response = await fetch(weatherUrl);
        // If One Call API fails with 401/403, try the free tier APIs
        if (!response.ok && (response.status === 401 || response.status === 403)) {
            // Use current weather + 5-day forecast (free tier)
            const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial`;
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial&cnt=24`;
            const [currentResponse, forecastResponse] = await Promise.all([
                fetch(currentWeatherUrl),
                fetch(forecastUrl)
            ]);
            if (!currentResponse.ok || !forecastResponse.ok) {
                if (currentResponse.status === 401 || forecastResponse.status === 401) {
                    console.error('Invalid API key for OpenWeather API. Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'undefined');
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({
                            error: 'Weather service authentication failed - API key is invalid or not activated. Please check your OpenWeather API key.',
                            details: 'Visit https://home.openweathermap.org/api_keys to verify your API key'
                        }),
                    };
                }
                if (currentResponse.status === 429 || forecastResponse.status === 429) {
                    return {
                        statusCode: 429,
                        headers,
                        body: JSON.stringify({ error: 'Weather service rate limit exceeded' }),
                    };
                }
                throw new Error(`Weather API responded with status: ${currentResponse.status}/${forecastResponse.status}`);
            }
            const [currentData, forecastData] = await Promise.all([
                currentResponse.json(),
                forecastResponse.json()
            ]);
            // Transform free tier response to our format
            const transformedData = {
                current: {
                    temperature: Math.round(currentData.main.temp),
                    condition: currentData.weather[0].description,
                    icon: currentData.weather[0].icon,
                },
                forecast: forecastData.list.slice(0, 24).reduce((acc, item, index) => {
                    // Group by day (every 8 items = 1 day with 3-hour intervals)
                    if (index % 8 === 0) {
                        const date = new Date(item.dt * 1000);
                        acc.push({
                            date: date.toISOString().split('T')[0],
                            temperature: {
                                high: Math.round(item.main.temp_max),
                                low: Math.round(item.main.temp_min),
                            },
                            condition: item.weather[0].description,
                            icon: item.weather[0].icon,
                            precipitationProbability: item.pop ? Math.round(item.pop * 100) : undefined,
                        });
                    }
                    return acc;
                }, []).slice(0, 3),
            };
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(transformedData),
            };
        }
        if (!response.ok) {
            if (response.status === 429) {
                return {
                    statusCode: 429,
                    headers,
                    body: JSON.stringify({ error: 'Weather service rate limit exceeded' }),
                };
            }
            throw new Error(`Weather API responded with status: ${response.status}`);
        }
        const weatherData = await response.json();
        // Transform the response to match our expected format
        const transformedData = {
            current: {
                temperature: Math.round(weatherData.current.temp),
                condition: weatherData.current.weather[0].description,
                icon: weatherData.current.weather[0].icon,
            },
            forecast: weatherData.daily.slice(0, 3).map(day => {
                const date = new Date(day.dt * 1000);
                return {
                    date: date.toISOString().split('T')[0],
                    temperature: {
                        high: Math.round(day.temp.max),
                        low: Math.round(day.temp.min),
                    },
                    condition: day.weather[0].description,
                    icon: day.weather[0].icon,
                    precipitationProbability: day.pop ? Math.round(day.pop * 100) : undefined,
                };
            }),
        };
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(transformedData),
        };
    }
    catch (error) {
        console.error('Weather API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch weather data. Please try again later.'
            }),
        };
    }
};
exports.handler = handler;
