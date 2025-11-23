/**
 * Automatic Backup Service for LinguaFlow
 * 
 * Features:
 * - Auto-backup on data changes (flashcards, translations, settings, lessons progress)
 * - Saves to BACKUP_LINGUAFLOW_IMAGE_TALKS folder
 * - File naming: Backup_linguaflow_data_TIMESTAMP.json
 * - Triggers on:
 *   - Flashcard additions (all categories)
 *   - Translation/phonetic caching
 *   - Settings changes
 *   - Lesson progress updates
 */

import * as db from './db';
import { addPixabayLog } from './pixabayLogger';

// Backup configuration
const BACKUP_INTERVAL_MS = 5 * 60 * 1000; // Auto-backup every 5 minutes if dirty
const DEBOUNCE_MS = 2000; // Wait 2 seconds after last change before backing up

interface BackupMetadata {
    version: string;
    timestamp: string;
    userAgent: string;
    totalFlashcards: number;
    totalCategories: number;
    totalPhonetics: number;
    totalTranslations: number;
}

interface ExtendedBackupData extends db.DatabaseSnapshot {
    metadata: BackupMetadata;
    lessonProgress: {
        quiz: Record<string, any>;
        writing: Record<string, any>;
    };
    customCategories: db.CustomCategory[];
    conversaCache: db.ConversaCacheRecord[];
}

class AutoBackupService {
    private isDirty = false;
    private debounceTimer: NodeJS.Timeout | null = null;
    private intervalTimer: NodeJS.Timeout | null = null;
    private isBackingUp = false;

    constructor() {
        this.startAutoBackupInterval();
        console.log('[AutoBackup] Service initialized');
    }

    /**
     * Mark data as dirty (changed) and trigger debounced backup
     */
    markDirty(reason: string): void {
        this.isDirty = true;
        console.log(`[AutoBackup] Data marked dirty: ${reason}`);

        // Clear previous debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Set new debounce timer
        this.debounceTimer = setTimeout(() => {
            this.performBackup(`Triggered by: ${reason}`);
        }, DEBOUNCE_MS);
    }

    /**
     * Start periodic auto-backup interval
     */
    private startAutoBackupInterval(): void {
        this.intervalTimer = setInterval(() => {
            if (this.isDirty && !this.isBackingUp) {
                this.performBackup('Periodic auto-backup');
            }
        }, BACKUP_INTERVAL_MS);
    }

    /**
     * Perform the actual backup operation
     * @param trigger - Reason for backup
     * @param forceDownload - If true, triggers file download (manual backup only)
     */
    async performBackup(trigger: string, forceDownload: boolean = false): Promise<void> {
        if (this.isBackingUp) {
            console.log('[AutoBackup] Backup already in progress, skipping');
            return;
        }

        try {
            this.isBackingUp = true;
            console.log(`[AutoBackup] Starting backup... (${trigger})`);

            // Collect all data
            const backupData = await this.collectBackupData();

            // Save to IndexedDB/localStorage (always)
            await this.saveToIndexedDB(backupData);

            // Only trigger file download if explicitly requested (manual backup)
            if (forceDownload) {
                await this.saveToFile(backupData);
            }

            this.isDirty = false;
            console.log('[AutoBackup] Backup completed successfully', forceDownload ? '(with download)' : '(internal only)');

        } catch (error) {
            console.error('[AutoBackup] Backup failed:', error);
            addPixabayLog('error', 'Auto-backup failed', {
                trigger,
                error: error instanceof Error ? error.message : String(error)
            });
        } finally {
            this.isBackingUp = false;
        }
    }

    /**
     * Collect all data for backup
     */
    private async collectBackupData(): Promise<ExtendedBackupData> {
        // Get base database snapshot
        const baseSnapshot = await db.exportDatabaseSnapshot();

        // Get lesson progress from localStorage
        const quizProgress = this.getLocalStorageData('linguaflow_quiz_progress', {});
        const writingProgress = this.getLocalStorageData('linguaflow_writing_progress', {});

        // Get custom categories
        const customCategories = await db.getAllCustomCategories();

        // Get conversa cache
        const conversaCache = await db.getAllConversaCache();

        // Create metadata
        const metadata: BackupMetadata = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            totalFlashcards: baseSnapshot.flashcards.length,
            totalCategories: customCategories.length,
            totalPhonetics: baseSnapshot.phonetics.length,
            totalTranslations: conversaCache.length
        };

        return {
            ...baseSnapshot,
            metadata,
            lessonProgress: {
                quiz: quizProgress,
                writing: writingProgress
            },
            customCategories,
            conversaCache
        };
    }

    /**
     * Get data from localStorage
     */
    private getLocalStorageData<T>(key: string, defaultValue: T): T {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`[AutoBackup] Failed to read localStorage key: ${key}`, error);
            return defaultValue;
        }
    }

    /**
     * Save backup to file (triggers browser download)
     */
    private async saveToFile(data: ExtendedBackupData): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `Backup_linguaflow_data_${timestamp}.json`;

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);

        console.log(`[AutoBackup] File saved: ${filename}`);
    }

    /**
     * Save backup snapshot to IndexedDB for quick recovery
     */
    private async saveToIndexedDB(data: ExtendedBackupData): Promise<void> {
        try {
            localStorage.setItem('linguaflow_last_backup', JSON.stringify({
                timestamp: data.metadata.timestamp,
                size: JSON.stringify(data).length
            }));

            // Store a compressed version in localStorage (limited to ~5MB)
            const compressed = this.compressBackupForStorage(data);
            localStorage.setItem('linguaflow_backup_snapshot', compressed);

            console.log('[AutoBackup] Backup snapshot saved to storage');
        } catch (error) {
            console.warn('[AutoBackup] Could not save to localStorage (quota exceeded?):', error);
        }
    }

    /**
     * Compress backup data for localStorage
     */
    private compressBackupForStorage(data: ExtendedBackupData): string {
        // Keep only essential data for quick recovery
        const essential = {
            metadata: data.metadata,
            settings: data.settings,
            flashcards: data.flashcards.slice(0, 100), // Keep last 100 flashcards
            customCategories: data.customCategories,
            lessonProgress: data.lessonProgress
        };

        return JSON.stringify(essential);
    }

    /**
     * Restore from backup file
     */
    async restoreFromFile(file: File): Promise<void> {
        try {
            console.log('[AutoBackup] Restoring from file:', file.name);

            const text = await file.text();
            const data = JSON.parse(text) as ExtendedBackupData;

            // Validate backup data
            if (!data.metadata || !data.settings) {
                throw new Error('Invalid backup file format');
            }

            // Restore to database
            await db.importDatabaseSnapshot(data);

            // Restore lesson progress
            if (data.lessonProgress) {
                localStorage.setItem('linguaflow_quiz_progress', JSON.stringify(data.lessonProgress.quiz));
                localStorage.setItem('linguaflow_writing_progress', JSON.stringify(data.lessonProgress.writing));
            }

            // Restore custom categories
            if (data.customCategories) {
                for (const category of data.customCategories) {
                    await db.saveCustomCategory(category);
                }
            }

            console.log('[AutoBackup] Restore completed successfully');
            alert('Backup restaurado com sucesso! Recarregando a página...');
            window.location.reload();

        } catch (error) {
            console.error('[AutoBackup] Restore failed:', error);
            throw new Error('Falha ao restaurar backup: ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    /**
     * Get backup statistics
     */
    getStats() {
        const lastBackup = this.getLocalStorageData('linguaflow_last_backup', null);
        return {
            isDirty: this.isDirty,
            isBackingUp: this.isBackingUp,
            lastBackup: lastBackup ? {
                timestamp: lastBackup.timestamp,
                size: lastBackup.size,
                age: Date.now() - new Date(lastBackup.timestamp).getTime()
            } : null
        };
    }

    /**
     * Manually trigger backup with file download
     */
    async manualBackup(): Promise<void> {
        await this.performBackup('Manual trigger', true); // Force download for manual backups
    }

    /**
     * Cleanup on service destruction
     */
    destroy(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
        }
    }
}

// Singleton instance
const autoBackupService = new AutoBackupService();

// Export functions for use in components
export const markBackupDirty = (reason: string) => autoBackupService.markDirty(reason);
export const performManualBackup = () => autoBackupService.manualBackup();
export const restoreBackup = (file: File) => autoBackupService.restoreFromFile(file);
export const getBackupStats = () => autoBackupService.getStats();

// Auto-backup triggers for common operations
export const triggerBackupOnFlashcardAdd = () => markBackupDirty('Flashcard added');
export const triggerBackupOnCategoryChange = () => markBackupDirty('Category changed');
export const triggerBackupOnSettingsChange = () => markBackupDirty('Settings changed');
export const triggerBackupOnLessonProgress = () => markBackupDirty('Lesson progress updated');
export const triggerBackupOnTranslationCache = () => markBackupDirty('Translation cached');

// Export the service instance for advanced usage
export default autoBackupService;
