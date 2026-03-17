const morgan = require('morgan');
const logger = require('../utils/logger');
const morganFormat = ':method :url - Trạng thái :status - Thời gian xử lý: :response-time ms';

const httpLogger = morgan(morganFormat, {
    stream: {
        write: (message) => {
            const logObject = {
                type: 'HTTP_METRICS',
                message: message.trim()
            };
            logger.info(logObject);
        }
    }
});
module.exports = httpLogger