import { Module, forwardRef } from '@nestjs/common';
import { PriceFeedService } from './price-feed.service';
// import { TradeModule } from '../trade/trade.module';
// import { OrderBookModule } from '../trade/order-book.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
// import { MasterTradingModule } from '../master-trading/master-trading.module';

@Module({
    imports: [
        EventEmitterModule
        // forwardRef(() => TradeModule), // Removed - trading module disabled
        // OrderBookModule, // Removed - trading module disabled
        // forwardRef(() => MasterTradingModule) // Removed - trading module disabled
    ],
    providers: [PriceFeedService],
    exports: [PriceFeedService]
})
export class PriceFeedModule { } 