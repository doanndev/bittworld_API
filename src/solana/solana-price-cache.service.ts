import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CacheService } from '../cache/cache.service';
import { SolanaService } from './solana.service';

interface PriceCache {
    priceUSD: number;
    priceSOL: number;
    timestamp: number;
}

@Injectable()
export class SolanaPriceCacheService {
    private readonly logger = new Logger(SolanaPriceCacheService.name);
    private readonly CACHE_TTL = 5000; // 5 seconds
    private readonly SOL_MINT = 'So11111111111111111111111111111111111111112';
    private readonly USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    // Devnet token addresses
    private readonly USDT_MINT_DEVNET = 'Es9vMFrzaCERh2M6VjRz2kV1Jp1oH6p1xZ8n3Ew1V9Y';
    private readonly BITT_MINT_DEVNET = '9wcpBxUDTi2K7cXoHsmP7K4S7ZSZpjedQrR3gh1evVNQ';
    private readonly SOL_USD_PRICE_CACHE_TTL = 30000; // 30 seconds

    constructor(
        private readonly configService: ConfigService,
        private readonly redisCacheService: CacheService,
        @Inject(forwardRef(() => SolanaService))
        private readonly solanaService: SolanaService
    ) { }

    async getTokenPriceInUSD(tokenAddress: string): Promise<number> {
        try {
            // Kiểm tra cache trong Redis
            const cacheKey = `token_price_usd:${tokenAddress}`;
            const cachedPrice = await this.redisCacheService.get(cacheKey);

            if (cachedPrice) {
                const priceData = JSON.parse(cachedPrice as string);
                if (Date.now() - priceData.timestamp < this.CACHE_TTL) {
                    return priceData.priceUSD;
                }
            }

            // Nếu là USDC, trả về 1
            if (tokenAddress === this.USDC_MINT) {
                return 1;
            }

            // Devnet USDT: Get real USDT price, fallback to 1
            if (tokenAddress === this.USDT_MINT_DEVNET) {
                try {
                    const realUsdtMint = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'; // Mainnet USDT
                    const response = await axios.get(`https://api.jup.ag/price/v2?ids=${realUsdtMint}`, {
                        timeout: 5000 // 5 second timeout
                    });
                    const usdtData = response.data.data[realUsdtMint];
                    if (usdtData?.price) {
                        const price = parseFloat(usdtData.price);
                        await this.updateCache(tokenAddress, price, 0);
                        return price;
                    }
                } catch (error) {
                    this.logger.warn(`Failed to get real USDT price, using fallback: ${error.message}`);
                }
                // Fallback: USDT = 1 USD (when Jupiter API is unavailable)
                await this.updateCache(tokenAddress, 1, 0);
                return 1;
            }

            // Devnet BITT: Always equals USDT price (1 BITT = 1 USDT)
            if (tokenAddress === this.BITT_MINT_DEVNET) {
                const usdtPrice = await this.getTokenPriceInUSD(this.USDT_MINT_DEVNET);
                await this.updateCache(tokenAddress, usdtPrice, 0);
                return usdtPrice;
            }

            // Nếu là SOL, lấy giá SOL
            if (tokenAddress === this.SOL_MINT) {
                const solPrice = await this.getSOLPrice();
                await this.updateCache(tokenAddress, solPrice, solPrice);
                return solPrice;
            }

            // Lấy giá từ Jupiter API
            const price = await this.getTokenPrice(tokenAddress);
            await this.updateCache(tokenAddress, price.priceUSD, price.priceSOL);
            return price.priceUSD;
        } catch (error) {
            this.logger.error(`Error getting token price for ${tokenAddress}:`, error);
            return 0;
        }
    }

    async getTokenPriceInSOL(tokenAddress: string): Promise<number> {
        try {
            // Kiểm tra cache trong Redis
            const cacheKey = `token_price_sol:${tokenAddress}`;
            const cachedPrice = await this.redisCacheService.get(cacheKey);

            if (cachedPrice) {
                const priceData = JSON.parse(cachedPrice as string);
                if (Date.now() - priceData.timestamp < this.CACHE_TTL) {
                    return priceData.priceSOL;
                }
            }

            // Devnet USDT: Get real USDT price in SOL
            if (tokenAddress === this.USDT_MINT_DEVNET) {
                try {
                    const solPrice = await this.getSOLPrice();
                    const usdtPrice = await this.getTokenPriceInUSD(this.USDT_MINT_DEVNET);
                    const priceSOL = solPrice > 0 ? usdtPrice / solPrice : 0;
                    await this.updateCache(tokenAddress, usdtPrice, priceSOL);
                    return priceSOL;
                } catch (error) {
                    this.logger.warn(`Failed to get USDT price in SOL: ${error.message}`);
                    const solPrice = await this.getSOLPrice();
                    const priceSOL = solPrice > 0 ? 1 / solPrice : 0;
                    await this.updateCache(tokenAddress, 1, priceSOL);
                    return priceSOL;
                }
            }

            // Devnet BITT: Always equals USDT price in SOL
            if (tokenAddress === this.BITT_MINT_DEVNET) {
                const usdtPriceSOL = await this.getTokenPriceInSOL(this.USDT_MINT_DEVNET);
                await this.updateCache(tokenAddress, 0, usdtPriceSOL);
                return usdtPriceSOL;
            }

            // Nếu là SOL, trả về 1
            if (tokenAddress === this.SOL_MINT) {
                await this.updateCache(tokenAddress, 0, 1);
                return 1;
            }

            // Lấy giá từ Jupiter API
            const price = await this.getTokenPrice(tokenAddress);
            await this.updateCache(tokenAddress, price.priceUSD, price.priceSOL);
            return price.priceSOL;
        } catch (error) {
            this.logger.error(`Error getting token price for ${tokenAddress}:`, error);
            return 0;
        }
    }

    private async getSOLPrice(): Promise<number> {
        try {
            const response = await axios.get(`https://api.jup.ag/price/v2?ids=${this.SOL_MINT}`);
            const priceData = response.data.data[this.SOL_MINT];

            if (priceData && priceData.price) {
                return parseFloat(priceData.price);
            }

            this.logger.warn(`No price data for SOL from Jupiter API`);
            return 0;
        } catch (error) {
            this.logger.error('Error getting SOL price:', error);
            return 0;
        }
    }

    private async getTokenPrice(tokenAddress: string): Promise<PriceCache> {
        try {
            const cacheKey = `token_price:${tokenAddress}`;
            const cachedPrice = await this.redisCacheService.get(cacheKey);

            if (cachedPrice) {
                const priceData = JSON.parse(cachedPrice as string);
                // Kiểm tra thời gian cache
                if (Date.now() - priceData.timestamp < 30000) { // 30 giây
                    return priceData;
                }
            }

            // Use Jupiter public API
            const jupiterResult = await this.solanaService.getTokenPriceInRealTime(tokenAddress);

            if (jupiterResult.error) {
                return { priceUSD: 0, priceSOL: 0, timestamp: Date.now() };
            }

            const result = {
                priceUSD: jupiterResult.priceUSD,
                priceSOL: jupiterResult.priceSOL,
                timestamp: Date.now()
            };
            return result;
        } catch (error) {
            this.logger.error(`Error getting token price: ${error.message}`);
            return { priceUSD: 0, priceSOL: 0, timestamp: Date.now() };
        }
    }

    private async updateCache(tokenAddress: string, priceUSD: number, priceSOL: number): Promise<void> {
        try {
            const timestamp = Date.now();
            const priceData = { priceUSD, priceSOL, timestamp };

            // Lưu vào Redis với TTL
            await this.redisCacheService.set(
                `token_price_usd:${tokenAddress}`,
                JSON.stringify(priceData),
                this.CACHE_TTL / 1000 // Chuyển đổi từ milliseconds sang seconds
            );

            await this.redisCacheService.set(
                `token_price_sol:${tokenAddress}`,
                JSON.stringify(priceData),
                this.CACHE_TTL / 1000
            );
        } catch (error) {
            this.logger.error(`Error updating cache for ${tokenAddress}:`, error);
        }
    }

    async getSOLPriceInUSD(): Promise<number> {
        try {
            const cacheKey = 'sol_price_usd';
            const cachedPrice = await this.redisCacheService.get(cacheKey);
            
            if (cachedPrice) {
                const priceData = JSON.parse(cachedPrice as string);
                if (Date.now() - priceData.timestamp < this.SOL_USD_PRICE_CACHE_TTL) {
                    return priceData.priceUSD;
                }
            }

            // Use Jupiter public API
            try {
                const response = await axios.get(`https://api.jup.ag/price/v2?ids=${this.SOL_MINT}`, {
                    timeout: 5000
                });
                const priceData = response.data.data[this.SOL_MINT];
                
                if (priceData && priceData.price) {
                    const price = parseFloat(priceData.price);
                    await this.updateSOLPriceCache(price);
                    return price;
                }
            } catch (jupiterError: any) {
                this.logger.warn(`Jupiter API failed (${jupiterError.response?.status || jupiterError.message}), using fallback SOL price`);
            }

            // Fallback: Use default SOL price if Jupiter API fails
            const fallbackPrice = 150; // Default SOL price ~$150
            this.logger.warn(`Using fallback SOL price: $${fallbackPrice}`);
            await this.updateSOLPriceCache(fallbackPrice);
            return fallbackPrice;
        } catch (error) {
            this.logger.error('Error getting SOL price in USD:', error);
            // Return fallback price instead of 0
            return 150; // Default SOL price fallback
        }
    }

    private async updateSOLPriceCache(price: number): Promise<void> {
        try {
            const cacheKey = 'sol_price_usd';
            const priceData = {
                priceUSD: price,
                timestamp: Date.now()
            };
            await this.redisCacheService.set(cacheKey, JSON.stringify(priceData), this.SOL_USD_PRICE_CACHE_TTL / 1000);
        } catch (error) {
            this.logger.error('Error updating SOL price cache:', error);
        }
    }

    // Phương thức để xóa cache (hữu ích cho testing)
    async clearCache(): Promise<void> {
        try {
            // Xóa tất cả cache liên quan đến giá token
            const keys = await this.redisCacheService.keys("*");
            const tokenPriceKeys = keys.filter(key => 
                key.startsWith('token_price_usd:') || 
                key.startsWith('token_price_sol:') ||
                key.startsWith('token_price:')
            );
            
            for (const key of tokenPriceKeys) {
                await this.redisCacheService.del(key);
            }
            
            this.logger.log('All token price cache cleared successfully');
        } catch (error) {
            this.logger.error('Error clearing token price cache:', error);
            throw error;
        }
    }
} 