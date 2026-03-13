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
        stepIndex: number
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

    async createOperation(notes?: { file: TFile; }[], tags?: { name: string; description: string; }[]) {
        const settings = this.plugin.serialized.settings;
        if (!this.plugin.serialized) {
            this.plugin.serialized = {
                settings: this.plugin.serialized,
                operations: []
            };
        }
        if (!this.plugin.serialized.operations) {
            this.plugin.serialized.operations = [];
        }
        if (!notes || !tags) {
            return;
        }

        const maxTagsPerRequest = settings.tagsPerRequest;
        const tagBreakdown: number[][] = [];
        if (maxTagsPerRequest == 0) {
            tagBreakdown.push([...Array(tags.length).keys()]);
        } else {
            for (let i = 0; i < tags.length; i += maxTagsPerRequest) {
                const end = Math.min(i + maxTagsPerRequest, tags.length);
                tagBreakdown.push([...Array(end - i).keys()].map(k => i + k));
            }
        }

        const steps: any[] = []
        notes.forEach(note => {
            tagBreakdown.forEach(tags => {
                steps.push({
                    file: note.file.path,
                    status: 'queued',
                    tags: tags,
                    tagOutcomes: {},
                    error: '',
                })
            });
        });

        const { tagDescriptions, ...settingsWithoutDescriptions } = settings;
        const operation: TagOperation = {
            id: crypto.randomUUID(),
            status: 'queued',
            tags: tags,
            steps: steps,
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
        const step = operation.steps.find((n, i) =>
            n.status === 'queued' && !this.processingNotes.find(no => no.operationId === operation.id && no.stepIndex === i)
        );

        // No more notes to process
        if (!step && !this.processingNotes.find(n => n.operationId === operation.id)) {
            operation.status = 'completed';
            operation.metadata.completedAt = Date.now();
            await this.plugin.savePersistent();
            this.operationEvents.dispatchEvent(new Event('update'));
            new Notice(`Finished tagging operation`);
            return;
        }

        // Still processing
        if (!step) {
            return;
        }

        if (operation.status === 'queued') {
            operation.status = 'processing';
            operation.metadata.startedAt = Date.now();
            await this.plugin.savePersistent();
            this.operationEvents.dispatchEvent(new Event('update'));
        }

        const stepIndex = operation.steps.indexOf(step);
        const noteLock = { operationId: operation.id, stepIndex: stepIndex };
        this.processingNotes.push(noteLock);
        await this.plugin.savePersistent();
        this.operationEvents.dispatchEvent(new Event('update'));

        const file = this.plugin.app.vault.getAbstractFileByPath(step.file);
        if (!file || !(file instanceof TFile)) {
            step.status = 'failed';
            step.error = 'File not found';
            this.processingNotes.remove(noteLock);
            await this.plugin.savePersistent();
            this.operationEvents.dispatchEvent(new Event('update'));
            new Notice(`File not found: '${step.file}'`);
            return;
        }

        try {
            const results = await this.aiHandler.evaluateNote(operation, stepIndex);
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const tagName = operation.tags[result.tagIndex].name;

                if (result.confidence >= operation.config.confidenceThreshold) {
                    const alreadyHadTag = await this.plugin.tagUtils.noteHasTag(file, tagName);
                    this.plugin.tagUtils.applyTagToNote(file, tagName, result.shouldTag);
                    if (alreadyHadTag && !result.shouldTag) {
                        step.tagOutcomes[tagName] = 'removed-tag';
                        new Notice(`Removed ${tagName} from ${step.file}`);
                    } else if (!alreadyHadTag && result.shouldTag) {
                        step.tagOutcomes[tagName] = 'applied-tag';
                        new Notice(`Applied ${tagName} to ${step.file}`);
                    } else {
                        step.tagOutcomes[tagName] = 'no-change';
                    }
                } else {
                    step.tagOutcomes[tagName] = 'skipped';
                }
            }

            step.status = 'done';
        } catch (e) {
            new Notice(`Error processing '${step.file}'`);
            console.error(`Error processing '${step.file}'`, e);
            step.status = 'failed';
            step.error = e;
        }

        this.processingNotes.remove(noteLock);
        await this.plugin.savePersistent();
        this.operationEvents.dispatchEvent(new Event('update'));
    }
}
