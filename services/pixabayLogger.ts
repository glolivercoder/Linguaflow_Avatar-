/**
 * pixabayLogger.ts
 * 
 * Simple logging utility for tracking application events and errors.
 * Stores logs in memory and provides methods to retrieve and clear them.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
}

class PixabayLogger {
    private logs: LogEntry[] = [];
    private maxLogs = 1000; // Keep last 1000 logs

    /**
     * Add a log entry
     */
    addLog(level: LogLevel, message: string, data?: any): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        };

        this.logs.push(entry);

        // Keep only the last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Also log to console
        const consoleMessage = `[${level.toUpperCase()}] ${message}`;
        switch (level) {
            case 'error':
                console.error(consoleMessage, data || '');
                break;
            case 'warn':
                console.warn(consoleMessage, data || '');
                break;
            case 'debug':
                console.debug(consoleMessage, data || '');
                break;
            default:
                console.log(consoleMessage, data || '');
        }
    }

    /**
     * Get all logs
     */
    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    /**
     * Get logs filtered by level
     */
    getLogsByLevel(level: LogLevel): LogEntry[] {
        return this.logs.filter(log => log.level === level);
    }

    /**
     * Get recent logs (last N entries)
     */
    getRecentLogs(count: number = 100): LogEntry[] {
        return this.logs.slice(-count);
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        this.logs = [];
        console.log('[PixabayLogger] Logs cleared');
    }

    /**
     * Export logs as JSON string
     */
    exportLogs(): string {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Get log statistics
     */
    getStats(): { total: number; byLevel: Record<LogLevel, number> } {
        const byLevel: Record<LogLevel, number> = {
            info: 0,
            warn: 0,
            error: 0,
            debug: 0
        };

        this.logs.forEach(log => {
            byLevel[log.level]++;
        });

        return {
            total: this.logs.length,
            byLevel
        };
    }
}

// Singleton instance
const logger = new PixabayLogger();

// Export convenience functions
export const addPixabayLog = (level: LogLevel, message: string, data?: any) =>
    logger.addLog(level, message, data);

export const getPixabayLogs = () => logger.getLogs();
export const getPixabayLogsByLevel = (level: LogLevel) => logger.getLogsByLevel(level);
export const getRecentPixabayLogs = (count?: number) => logger.getRecentLogs(count);
export const clearPixabayLogs = () => logger.clearLogs();
export const exportPixabayLogs = () => logger.exportLogs();
export const getPixabayLogStats = () => logger.getStats();

export default logger;
