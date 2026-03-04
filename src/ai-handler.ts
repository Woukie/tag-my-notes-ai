import { TFile } from 'obsidian';
import TagMyNotesPlugin from './main';
import { TagOperation } from './types';
import { createGateway, generateText, LanguageModel, ModelMessage, Output } from 'ai';
import { createOllama, ollama } from 'ollama-ai-provider-v2';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export interface TagDecision {
    shouldTag: boolean;
    confidence: number;
}

export class AIHandler {
    private plugin: TagMyNotesPlugin;

    constructor(plugin: TagMyNotesPlugin) {
        this.plugin = plugin;
    }

    async evaluateNoteForTag(
        operation: TagOperation,
        noteIndex: number
    ): Promise<TagDecision> {
        const steps = operation.config.reasoningSteps;
        const note = operation.notes[noteIndex];
        if (!note) throw new Error(`Invalid note at ${noteIndex}`);
        const file = this.plugin.app.vault.getAbstractFileByPath(note.file);

        if (!file || !(file instanceof TFile)) {
            throw new Error(`Cannot read file: ${note.file}`);
        }

        const content = await this.plugin.app.vault.read(file);

        let processedContent = content;
        if (operation.config.contextClamping.enabled &&
            content.length > operation.config.contextClamping.maxContentLength) {

            if (operation.config.contextClamping.truncationStrategy === 'beginning') {
                processedContent = '...[truncated]...' +
                    content.slice(-operation.config.contextClamping.maxContentLength);
            } else {
                processedContent = content.slice(0, operation.config.contextClamping.maxContentLength) +
                    '...[truncated]...';
            }
        }

        const messages: ModelMessage[] = [{
            role: 'user',
            content: `Filename: ${file?.name}\n\nContent: ${content}`
        }];

        const model = this.getModel(operation);

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const lastStep = i === steps.length - 1;

            const stepPrompt = step.prompt
                .replace(/{tag}/g, note.tag.name)
                .replace(/{description}/g, note.tag.description);

            messages.push({
                role: 'user',
                content: stepPrompt
            });

            if (!lastStep) {

                const { text } = await generateText({
                    model: model,
                    messages: messages,
                    temperature: operation.config.temperature,
                    maxOutputTokens: operation.config.maxTokens,
                });

                messages.push({
                    role: 'assistant',
                    content: text || ''
                });
            } else {
                return this.handleLastStep(operation, messages)
            }
        }

        throw new Error("Could not make AI request")
    }

    private getModel(operation: TagOperation): LanguageModel {
        switch (operation.config.aiProvider) {
            case 'ollama':
                var ollamaSettings = operation.config.ollamaSettings;
                const ollama = createOllama({
                    baseURL: ollamaSettings.baseUrl === '' ? undefined : ollamaSettings.baseUrl,
                });
                return ollama(ollamaSettings.modelId);
            case 'open_router':
                var openRouterSettings = operation.config.openRouterSettings;
                const openRouter = createOpenRouter({
                    baseURL: openRouterSettings.baseUrl === '' ? undefined : openRouterSettings.baseUrl,
                    apiKey: openRouterSettings.apiKey === '' ? undefined : openRouterSettings.apiKey,
                });
                return openRouter(openRouterSettings.modelId);
            case 'openai':
                var openaiSettings = operation.config.openaiSettings;
                const openAI = createOpenAI({
                    apiKey: openaiSettings.apiKey === '' ? undefined : openaiSettings.apiKey,
                    baseURL: openaiSettings.baseUrl === '' ? undefined : openaiSettings.baseUrl,
                })
                return openAI(openaiSettings.modelId);
            default:
                var gatewaySettings = operation.config.gatewaySettings;
                const gateway = createGateway({
                    apiKey: gatewaySettings.apiKey === '' ? undefined : gatewaySettings.apiKey,
                    baseURL: gatewaySettings.baseUrl === '' ? undefined : gatewaySettings.baseUrl,
                });
                return gateway(gatewaySettings.modelId);
        }
    }

    private async handleLastStep(operation: TagOperation, messages: ModelMessage[]): Promise<TagDecision> {
        const gateway = createGateway({
            apiKey: operation.config.gatewaySettings.apiKey,
        });
        const model = gateway(operation.config.gatewaySettings.modelId);


        const { output } = await generateText({
            model: model,
            output: Output.object({
                schema: z.object({
                    shouldTag: z.boolean().describe(operation.config.shouldTagDescription),
                    confidence: z.number().describe(operation.config.confidenceDescription).max(1).min(0),
                }),
            }),
            messages: messages,
            temperature: operation.config.temperature,
            maxOutputTokens: operation.config.maxTokens,
        });

        if (!output) {
            throw new Error("No response from AI");
        }

        return output;
    }
}
