import { Controller, Get, UseGuards, Query, Param, Post, Body, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnChainService } from './on-chain.service';
import { BirdeyeService, Timeframe } from './birdeye.service';
import { PublicKey } from '@solana/web3.js';
import { SolanaService } from '../solana/solana.service';
import { GetHistoriesTransactionDto } from './dto/get-histories-transaction.dto';
// import { GetTopCoinsDto, TimeFrameEnum } from '../trade/dto/get-top-coins.dto';
// Define locally since trade module is removed
enum TimeFrameEnum {
  FIVE_MIN = '5m',
  FIFTEEN_MIN = '15m',
  THIRTY_MIN = '30m',
  ONE_HOUR = '1h',
  SIX_HOURS = '6h',
  TWELVE_HOURS = '12h',
  TWENTY_FOUR_HOURS = '24h'
}
interface GetTopCoinsDto {
  timeframe?: TimeFrameEnum;
  limit?: number;
  sort_by?: string;
  sort_type?: string;
}
import { TopCoinsResponse } from './birdeye.service';
// import { ChartType, SolanaTrackerService, TimeFrameType } from './solana-tracker.service';
type ChartType = '1s' | '5s' | '15s' | '30s' | '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1mn';
import { GetChartDto } from './dto/get-chart.dto';
import { SolanaTrackerTradeService } from './services/solana-tracker-trade.service';
import { CacheService } from '../cache/cache.service';

interface TradingViewResponse {
    success: boolean;
    data?: {
        historical: Array<{
            time: number;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
        }>;
        current: {
            time: number;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
        } | null;
    };
    error?: string;
}

@Controller('on-chain')
export class OnChainController {
    private readonly logger = new Logger(OnChainController.name);

    constructor(
        private readonly onChainService: OnChainService,
        private readonly birdeyeService: BirdeyeService,
        private readonly solanaService: SolanaService,
        // private readonly solanaTrackerService: SolanaTrackerService,
        // private readonly solanaTrackerTradeService: SolanaTrackerTradeService,
        private readonly cacheService: CacheService
    ) { }

    @Get('chart/:tokenAddress')
    async getTradingViewChart(
        @Param('tokenAddress') tokenAddress: string,
        @Query() query: GetChartDto
    ) {
        try {
            this.logger.log(`Getting chart data for token ${tokenAddress} with params:`, query);

            const chartData = await this.onChainService.getChartData(
                tokenAddress,
                query.type as ChartType || '1m',
                query.time_from,
                query.time_to,
                query.market_cap,
                query.remove_outliers
            );

            return {
                success: true,
                data: chartData
            };
        } catch (error) {
            this.logger.error(`Error getting chart data: ${error.message}`);
            throw error;
        }
    }

    @Get('clear-cache')
    @UseGuards(JwtAuthGuard)
    async clearCache(@Query('tokenAddress') tokenAddress: string) {
        await this.birdeyeService.clearOHLCVCache(tokenAddress);
        return { success: true, message: 'Cache cleared successfully' };
    }

    @Post('test-chart')
    @UseGuards(JwtAuthGuard)
    async testChart(@Body() data: { tokenAddress: string }) {
        try {
            const { tokenAddress } = data;
            this.logger.log(`Testing chart data for token: ${tokenAddress}`);

            // Validate token address
            if (!tokenAddress) {
                throw new Error('Token address is required');
            }

            // Get initial price data
            const priceData = await this.solanaService.getTokenPriceInRealTime(tokenAddress);
            if (!priceData || priceData.priceUSD <= 0) {
                throw new Error('Unable to get initial price data for token');
            }

            // Subscribe to token for real-time updates
            await this.onChainService.subscribeToToken(tokenAddress, (updateData) => {
                this.logger.debug('Received real-time update:', {
                    tokenAddress,
                    time: new Date(updateData.time).toISOString(),
                    price: updateData.close,
                    volume: updateData.volume
                });
            });

            // Get current candle data
            const currentCandle = this.onChainService.getCurrentCandle(tokenAddress);

            // Validate candle data
            if (!currentCandle || currentCandle.close <= 0) {
                throw new Error('Invalid candle data received');
            }

            // Log detailed information
            this.logger.debug('Current candle data:', {
                tokenAddress,
                time: new Date(currentCandle.time).toISOString(),
                open: currentCandle.open,
                high: currentCandle.high,
                low: currentCandle.low,
                close: currentCandle.close,
                volume: currentCandle.volume
            });

            return {
                success: true,
                data: {
                    ...currentCandle,
                    priceUSD: priceData.priceUSD,
                    priceSOL: priceData.priceSOL
                }
            };
        } catch (error) {
            this.logger.error('Error in test-chart:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    @Get('histories')
    async getHistories(@Query() query: GetHistoriesTransactionDto) {
        // SolanaTracker removed - endpoint disabled
        return {
            success: false,
            error: 'SolanaTracker service has been removed. This endpoint is no longer available.'
        };
    }

    @Get('my-histories/:tokenAddress')
    @UseGuards(JwtAuthGuard)
    async getMyHistories(
        @Param('tokenAddress') tokenAddress: string,
        @Query('walletAddress') walletAddress: string
    ) {
        // SolanaTracker removed - endpoint disabled
        return {
            success: false,
            error: 'SolanaTracker service has been removed. This endpoint is no longer available.'
        };
    }

    @Get('top-coins')
    async getTopCoins(@Query() query: GetTopCoinsDto): Promise<TopCoinsResponse> {
        // SolanaTracker removed - endpoint disabled
        throw new Error('SolanaTracker service has been removed. This endpoint is no longer available.');
        // try {
        //     // Chuyển đổi timeframe từ TimeFrameEnum sang TimeFrameType
        //     let timeframe: TimeFrameType = '24h'; // Mặc định

        //     if (query.timeframe) {
        //         // TimeFrameEnum và TimeFrameType có giá trị giống nhau nên có thể chuyển đổi trực tiếp
        //         timeframe = query.timeframe as TimeFrameType;
        //     }

        //     this.logger.log(`Getting top coins using SolanaTracker API with timeframe: ${timeframe}`);

        //     // Gọi đến Solana Tracker API
        //     const trendingTokensResponse = await this.solanaTrackerService.getTrendingTokens(
        //         timeframe,
        //         query.limit || 100
        //     );

        //     // Chuyển đổi dữ liệu sang định dạng TopCoins
        //     return this.solanaTrackerService.convertToTopCoinsFormat(
        //         trendingTokensResponse.data,
        //         query.limit || 100,
        //         query.sort_by || 'market_cap',
        //         query.sort_type || 'desc'
        //     );
        // } catch (error) {
        //     this.logger.error(`Error getting top coins from SolanaTracker: ${error.message}`);
        //     throw error;
        // }
    }

    @Get('latest-coins')
    async getLatestCoins(@Query('limit') limit?: number): Promise<TopCoinsResponse> {
        // SolanaTracker removed - endpoint disabled
        throw new Error('SolanaTracker service has been removed. This endpoint is no longer available.');
    }

    @Get('stats-token/:tokenAddress')
    async getTokenStats(@Param('tokenAddress') tokenAddress: string) {
        // SolanaTracker removed - endpoint disabled
        return {
            success: false,
            error: 'SolanaTracker service has been removed. This endpoint is no longer available.'
        };
    }

    @Get('search')
    async searchTokens(
        @Query('query') query: string,
        @Query('limit') limit?: number
    ) {
        // SolanaTracker removed - endpoint disabled
        return {
            success: false,
            error: 'SolanaTracker service has been removed. This endpoint is no longer available.'
        };
    }

    @Get('pnl/:walletAddress')
    @UseGuards(JwtAuthGuard)
    async getWalletPnl(@Param('walletAddress') walletAddress: string) {
        // SolanaTracker removed - endpoint disabled
        return {
            success: false,
            error: 'SolanaTracker service has been removed. This endpoint is no longer available.'
        };
    }

    @Get('wallet/:walletAddress/trades')
    @UseGuards(JwtAuthGuard)
    async getWalletTrades(
        @Param('walletAddress') walletAddress: string,
        @Query('cursor') cursor?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50
    ) {
        // SolanaTracker removed - endpoint disabled
        return {
            success: false,
            error: 'SolanaTracker service has been removed. This endpoint is no longer available.'
        };
        // try {
        //     if (!walletAddress) {
        //         throw new Error('Wallet address is required');
        //     }

        //     this.logger.log(`Getting trades for wallet ${walletAddress}`);

        //     const data = await this.solanaTrackerService.getWalletTrades(walletAddress, cursor);

        //     // Add type property to each trade based on SOL address position
        //     const tradesWithType = data.trades.map(trade => ({
        //         ...trade,
        //         type: trade.from.address === 'So11111111111111111111111111111111111111112' ? 'buy' : 'sell'
        //     }));

        //     // Implement pagination after getting the data
        //     const startIndex = (page - 1) * limit;
        //     const endIndex = startIndex + limit;
        //     const totalItems = tradesWithType.length;
        //     const totalPages = Math.ceil(totalItems / limit);
        //     const paginatedTrades = tradesWithType.slice(startIndex, endIndex);

        //     return {
        //         success: true,
        //         data: {
        //             trades: paginatedTrades,
        //             pagination: {
        //                 currentPage: page,
        //                 totalPages,
        //                 totalItems,
        //                 itemsPerPage: limit,
        //                 hasNextPage: page < totalPages,
        //                 hasPreviousPage: page > 1
        //             }
        //         }
        //     };
        // } catch (error) {
        //     this.logger.error(`Error getting wallet trades: ${error.message}`);
        //     return {
        //         success: false,
        //         error: error.message
        //     };
        // }
    }

    @Get('holders/:tokenAddress')
    async getTokenHolders(
        @Param('tokenAddress') tokenAddress: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0
    ) {
        // SolanaTracker removed - endpoint disabled
        return {
            success: false,
            error: 'SolanaTracker service has been removed. This endpoint is no longer available.'
        };
    }
}
