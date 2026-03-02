import { Notice, TFile } from 'obsidian';
import { AIHandler } from './ai-handler';
import TagMyNotesPlugin from './main';
import { TagOperation } from './types';

// This method allows for fututre parallelisation
export class OperationProcessor {
    private plugin: TagMyNotesPlugin;
    private aiHandler: AIHandler;
    operationEvents = new EventTarget();

    // Keep track of which notes are being processed, as we can't store processing status in persistent due to restart issues
    private processingNotes: Array<{
        operationId: string,
        fileIndex: number
    }> = [];

    constructor(plugin: TagMyNotesPlugin) {
        this.plugin = plugin;
        this.aiHandler = new AIHandler(plugin);
    }

    async cancelOperation(operationId: string) {
        const operation = this.plugin.serialized.operations.find(op => op.id === operationId);
        if (!operation) return;

        if (operation.status === 'processing' || operation.status === 'queued') {
            operation.status = 'cancelled';
            operation.metadata.completedAt = Date.now();
            await this.plugin.savePersistent();
            this.operationEvents.dispatchEvent(new Event('update'));
            new Notice(`Operation cancelled`);
        }
    }

    async deleteOperation(operationId: string) {
        const index = this.plugin.serialized.operations.findIndex(op => op.id === operationId);
        if (index !== -1) {
            this.plugin.serialized.operations.splice(index, 1);
            await this.plugin.savePersistent();
            this.operationEvents.dispatchEvent(new Event('update'));
            new Notice(`Operation deleted`);
        }
    }

    async createOperation(notes?: { file: TFile; tag: { name: string; description: string; } }[]) {
        if (!this.plugin.serialized) {
            this.plugin.serialized = {
                settings: this.plugin.serialized,
                operations: []
            };
        }
        if (!this.plugin.serialized.operations) {
            this.plugin.serialized.operations = [];
        }

        if (!notes) {
            return
        }

        const { tagDescriptions, ...settingsWithoutDescriptions } = this.plugin.serialized.settings;
        const operation: TagOperation = {
            id: crypto.randomUUID(),
            status: 'queued',
            notes: notes.map(step => ({
                file: step.file.path,
                status: 'queued',
                error: '',
                tag: step.tag
            })),
            config: {
                ...settingsWithoutDescriptions,
            },
            metadata: {
                createdAt: Date.now()
            },
        };

        this.plugin.serialized.operations.unshift(operation);
        await this.plugin.saveData(this.plugin.serialized);
        this.operationEvents.dispatchEvent(new Event('update'));
    }

    async watchOperations() {
        while (true) {
            for (let i = this.plugin.serialized.operations.length - 1; i >= 0; i--) {
                const operation = this.plugin.serialized.operations[i];
                if (operation.status === 'queued' || operation.status === 'processing') {
                    await this.handleOperation(operation);
                    break;
                }
            }
            await new Promise(r => setTimeout(r, 100));
        }
    }

    private async handleOperation(operation: TagOperation) {
        const nextNote = operation.notes.find((n, i) =>
            n.status === 'queued' && !this.processingNotes.find(no => no.operationId === operation.id && no.fileIndex === i)
        );

        // No more notes to process
        if (!nextNote && !this.processingNotes.find(n => n.operationId === operation.id)) {
            operation.status = 'completed';
            operation.metadata.completedAt = Date.now();
            await this.plugin.savePersistent();
            this.operationEvents.dispatchEvent(new Event('update'));
            new Notice(`Finished tagging operation`)
            return;
        }

        // Still processing
        if (!nextNote) {
            return;
        }

        if (operation.status === 'queued') {
            operation.status = 'processing';
            operation.metadata.startedAt = Date.now();
            await this.plugin.savePersistent();
            this.operationEvents.dispatchEvent(new Event('update'));
        }

        const noteIndex = operation.notes.indexOf(nextNote);
        const noteLock = { operationId: operation.id, fileIndex: noteIndex };

        this.processingNotes.push(noteLock)
        await this.plugin.savePersistent();
        this.operationEvents.dispatchEvent(new Event('update'));

        const file = this.plugin.app.vault.getAbstractFileByPath(nextNote.file);
        if (!file || !(file instanceof TFile)) {
            nextNote.status = 'failed';
            nextNote.error = 'File not found';
            this.processingNotes.remove(noteLock);
            await this.plugin.savePersistent();
            this.operationEvents.dispatchEvent(new Event('update'));
            new Notice(`File not found: '${nextNote.file}'`);
            return;
        }

        try {
            const result = await this.aiHandler.evaluateNoteForTag(operation, noteIndex)
            if (result.confidence >= operation.config.confidenceThreshold) {
                const alreadyHadTag = await this.plugin.tagUtils.noteHasTag(file, nextNote.tag.name)
                this.plugin.tagUtils.applyTagToNote(file, nextNote.tag.name, result.shouldTag)
                nextNote.status = 'no-change';
                if (alreadyHadTag && !result.shouldTag) {
                    nextNote.status = 'removed-tag'
                    new Notice(`Removed ${nextNote.tag.name} from ${nextNote.file}`)
                } else if (!alreadyHadTag && result.shouldTag) {
                    nextNote.status = 'applied-tag'
                    new Notice(`Applied ${nextNote.tag.name} to ${nextNote.file}`)
                }
            } else {
                nextNote.status = 'skipped'
            }
        } catch (e) {
            new Notice(`Error processing '${nextNote.file}' for tag '${nextNote.tag.name}'`)
            console.error(`Error processing '${nextNote.file}' for tag '${nextNote.tag.name}'`, e)
            nextNote.status = 'failed';
            nextNote.error = e;
        }

        this.processingNotes.remove(noteLock)

        await this.plugin.savePersistent();
        this.operationEvents.dispatchEvent(new Event('update'));
    }
}
