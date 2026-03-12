import { TFile } from 'obsidian';
import TagMyNotesPlugin from './main';
import { TagOperation } from './types';
import { createGateway, generateText, LanguageModel, ModelMessage, Output } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createMistral } from '@ai-sdk/mistral';

export interface TagDecision {
    tagName: string;
    shouldTag: boolean;
    confidence: number;
}

export class AIHandler {
    private plugin: TagMyNotesPlugin;

    constructor(plugin: TagMyNotesPlugin) {
        this.plugin = plugin;
    }

    async evaluateNote(
        operation: TagOperation,
        stepIndex: number
    ): Promise<TagDecision[]> {
        const steps = operation.config.reasoningSteps;
        const step = operation.steps[stepIndex];
        if (!step) throw new Error(`Invalid note at ${stepIndex}`);
        const file = this.plugin.app.vault.getAbstractFileByPath(step.file);

        if (!file || !(file instanceof TFile)) {
            throw new Error(`Cannot read file: ${step.file}`);
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

        const tagDescriptions = step.tags.map(index => operation.tags[index]);

        const tagsBlock = tagDescriptions
            .map(t => `- ${t.name}: ${t.description}`)
            .join('\n');

        const messages: ModelMessage[] = [{
            role: 'user',
            content: `Filename: ${file.name}\n\nContent: ${processedContent}\n\nTags to evaluate: ${tagsBlock}`
        }];

        const model = this.getModel(operation);

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const lastStep = i === steps.length - 1;

            const stepPrompt = step.prompt
            if (operation.config.tagsPerRequest === 1) {
                stepPrompt
                    .replace(/{tag}/g, operation.tags[0].name)
                    .replace(/{description}/g, operation.tags[0].description);
            } else {
                stepPrompt
                    .replace(/{tags}/g, tagsBlock);
            }

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
            case 'mistral':
                var mistralSettings = operation.config.mistralSettings;
                const mistral = createMistral({
                    apiKey: mistralSettings.apiKey === '' ? undefined : mistralSettings.apiKey,
                    baseURL: mistralSettings.baseUrl === '' ? undefined : mistralSettings.baseUrl,
                })
                return mistral(mistralSettings.modelId);
                break;
            default:
                var gatewaySettings = operation.config.gatewaySettings;
                const gateway = createGateway({
                    apiKey: gatewaySettings.apiKey === '' ? undefined : gatewaySettings.apiKey,
                    baseURL: gatewaySettings.baseUrl === '' ? undefined : gatewaySettings.baseUrl,
                });
                return gateway(gatewaySettings.modelId);
        }
    }

    private async handleLastStep(operation: TagOperation, messages: ModelMessage[]): Promise<TagDecision[]> {
        const model = this.getModel(operation);
        const step = operation.steps.last();
        if (!step) throw new Error('No operation steps');
        const tags = step.tags.map(index => operation.tags[index]);

        const decisionSchema = z.object({
            shouldTag: z.boolean().describe(operation.config.shouldTagDescription),
            confidence: z.number().describe(operation.config.confidenceDescription).max(1).min(0),
        });

        const tagSchema = Object.fromEntries(
            tags.map(t => [t.name, decisionSchema])
        );

        const { output } = await generateText({
            model: model,
            output: Output.object({
                schema: z.object({
                    tags: z.object(tagSchema)
                }),
            }),
            messages: messages,
            temperature: operation.config.temperature,
            maxOutputTokens: operation.config.maxTokens,
        });

        if (!output) {
            throw new Error("No response from AI");
        }

        return Object.entries(output.tags).map(([name, decision]) =>
            ({ ...decision, tagName: name }) as TagDecision
        );
    }
}
