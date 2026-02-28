import { TFile } from 'obsidian';
import TagMyNotesPlugin from './main';
import { TagOperation } from './types';

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
        const note = operation.notes.at(noteIndex);
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

        const messages: any[] = [
            {
                role: 'user',
                content: `Filename: ${file?.name}\n\nContent: ${content}`
            }
        ];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const isLastStep = i === steps.length - 1;

            const stepPrompt = step.prompt
                .replace(/{tag}/g, note.tag.name)
                .replace(/{description}/g, note.tag.description);

            messages.push({
                role: 'user',
                content: stepPrompt
            });

            if (!isLastStep) {
                const response = await this.plugin.openai.chat.completions.create({
                    model: operation.config.openAIModel,
                    messages: messages,
                    temperature: operation.config.temperature,
                    max_tokens: operation.config.maxTokens,
                    response_format: { type: 'text' }
                });

                messages.push({
                    role: 'assistant',
                    content: response.choices[0].message.content || ''
                });
            } else {
                const format = operation.config.responseFormat;

                if (format === 'function_calling') {
                    return this.handleFunctionCalling(operation, messages)
                } else {
                    return this.handleStructured(operation, messages)
                }
            }
        }

        throw new Error("Could not make AI request")
    }

    private async handleFunctionCalling(
        operation: TagOperation,
        messages: any[]
    ): Promise<TagDecision> {
        const response = await this.plugin.openai.chat.completions.create({
            model: operation.config.openAIModel,
            messages: messages,
            temperature: operation.config.temperature,
            max_tokens: operation.config.maxTokens,
            tools: [{
                type: 'function',
                function: {
                    name: 'record_tag_decision',
                    description: operation.config.functionDescription,
                    strict: true,
                    parameters: {
                        type: 'object',
                        properties: {
                            shouldTag: {
                                type: 'boolean',
                                description: operation.config.shouldTagDescription
                            },
                            confidence: {
                                type: 'number',
                                description: operation.config.confidenceDescription,
                                minimum: 0,
                                maximum: 1
                            }
                        },
                        required: ['shouldTag', 'confidence'],
                        additionalProperties: false
                    }
                }
            }],
            tool_choice: {
                type: 'function',
                function: { name: 'record_tag_decision' }
            }
        });

        const toolCall = response.choices[0].message.tool_calls?.[0];
        if (toolCall && toolCall.function.name === 'record_tag_decision') {
            try {
                const result = JSON.parse(toolCall.function.arguments);
                return {
                    shouldTag: typeof result.shouldTag === 'boolean' ? result.shouldTag : false,
                    confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0
                };
            } catch (e) {
                throw new Error('Failed to parse function arguments');
            }
        }

        throw new Error('No function call data in AI response');
    }

    private async handleStructured(operation: TagOperation, messages: any[]): Promise<TagDecision> {
        const responseFormat = {
            type: 'json_schema' as const,
            json_schema: {
                name: 'tag_decision',
                strict: true,
                schema: {
                    type: 'object',
                    properties: {
                        shouldTag: {
                            type: 'boolean',
                            description: operation.config.shouldTagDescription
                        },
                        confidence: {
                            type: 'number',
                            description: operation.config.confidenceDescription,
                            minimum: 0,
                            maximum: 1
                        }
                    },
                    required: ['shouldTag', 'confidence'],
                    additionalProperties: false
                }
            }
        }

        const response = await this.plugin.openai.chat.completions.create({
            model: operation.config.openAIModel,
            messages: messages,
            temperature: operation.config.temperature,
            max_tokens: operation.config.maxTokens,
            response_format: responseFormat
        });

        const content = response.choices[0].message.content;

        if (content) {
            const message = response.choices[0].message;
            if ('refusal' in message && message.refusal) {
                throw new Error("AI refused to respond");
            }

            return this.parseTagDecision(content);
        }

        throw new Error("No content in AI response");
    }

    private parseTagDecision(response: string): TagDecision {
        const parsed = JSON.parse(response);

        if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('Response is not an object');
        }

        if (!('shouldTag' in parsed) || !('confidence' in parsed)) {
            throw new Error('Missing required fields');
        }

        if (typeof parsed.shouldTag !== 'boolean') {
            throw new Error('shouldTag must be boolean');
        }

        if (typeof parsed.confidence !== 'number' ||
            parsed.confidence < 0 ||
            parsed.confidence > 1) {
            throw new Error('confidence must be a number between 0 and 1');
        }

        return {
            shouldTag: parsed.shouldTag,
            confidence: parsed.confidence
        };
    }
}