const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, json } = format;

const sanitizeFilter = format((info) => {
    if (info.data) {
        const sanitizedData = { ...info.data };
        if (sanitizedData.password) sanitizedData.password = '***MASKED***';
        if (sanitizedData.token) sanitizedData.token = '***MASKED***';
        if (sanitizedData.refreshToken) sanitizedData.refreshToken = '***MASKED***';
        info.data = sanitizedData;
    }
    return info;
});
const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        sanitizeFilter(),
        json()
    ),
    transports: [
        new transports.Console(),
        new transports.File({filename: 'logs/error.log', level: 'error'}),
        new transports.File({filename: 'logs/combined.log'})
    ],
});
module.exports = logger;