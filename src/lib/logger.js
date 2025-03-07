import winston from "winston";

const isDev = (process.env.NODE_ENV || "production") === "development";

const logger = winston.createLogger({
    level: isDev ? "debug" : "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        // Log to logger. Can add file transports here if needed.
        new winston.transports.Console()
    ]
});

export default logger;