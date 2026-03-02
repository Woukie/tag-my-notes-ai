import { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
    tagDescriptions: [{ name: "quote", description: "Applies to notes containing only a quote from any media. i.e., Movies, people, studies..." }],
    confidenceThreshold: 0.7,
    reasoningSteps: [
        {
            prompt: `Take a look at the note. Decide whether the tag '{tag}' belongs on the note.

Tag description: {description}`
        }
    ],
    temperature: 0.3,
    maxTokens: 200,
    contextClamping: {
        enabled: false,
        maxContentLength: 3000,
        truncationStrategy: 'beginning',
    },
    aiProvider: 'vercel_gateway',
    openaiSettings: {
        apiKey: '',
        baseUrl: '',
        modelId: 'gpt-4o-mini'
    },
    gatewaySettings: {
        baseUrl: '',
        apiKey: '',
        modelId: 'openai/gpt-4o-mini'
    },
    ollamaSettings: {
        baseUrl: 'http://localhost:11434/api',
        modelId: 'llama3'
    },
    confidenceDescription: 'Your confidence level from 0 to 1',
    shouldTagDescription: 'Whether the note should have this tag'
};