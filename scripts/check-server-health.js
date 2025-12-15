require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });

console.log('🧪 Testing service imports...');

try {
    console.log('Loading Performance utility...');
    const perf = require('../server/src/utils/performance');
    console.log('✅ Performance loaded');

    console.log('Loading QuantEngine...');
    const quant = require('../server/src/services/quantEngine');
    console.log('✅ QuantEngine loaded');

    console.log('Loading TradeExecutor...');
    const tradeExecutor = require('../server/src/services/tradeExecutor');
    console.log('✅ TradeExecutor loaded');

    console.log('Loading SignalWorker...');
    const signalWorker = require('../server/src/services/signalWorker');
    console.log('✅ SignalWorker loaded');

    console.log('Loading BotManager...');
    const botManager = require('../server/src/services/botManager');
    console.log('✅ BotManager loaded');

    console.log('🎉 All imports successful. No circular dependency crashes detected.');

} catch (error) {
    console.error('❌ Import Failed:', error);
    process.exit(1);
}
