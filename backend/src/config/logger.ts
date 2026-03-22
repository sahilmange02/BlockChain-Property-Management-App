import winston from "winston";

export const logger = winston.createLogger({
    level: "info",
    // FORMAT: tells Winston how to print each log line
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.colorize(),   // adds colours in terminal
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            // If there's extra data attached, print it too
            const extras = Object.keys(meta).length
                ? "\n" + JSON.stringify(meta, null, 2)
                : "";
            return `[${timestamp}] ${level}: ${message}${extras}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        // Also save logs to a file
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()   // file logs stay as JSON for easy parsing
            )
        }),
        new winston.transports.File({
            filename: "logs/combined.log",
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
    ],
    // Don't crash the server if logging fails
    exitOnError: false,
});