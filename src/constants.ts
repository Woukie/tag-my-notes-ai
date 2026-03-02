import { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
    tagDescriptions: [{ name: "online_resource", description: "Very broad category, applying to every note that focuses on an online resource" }],
    confidenceThreshold: 0.7,
    reasoningSteps: [
        {
            prompt: `Take a look at the note. Discuss what the note is about and whether the tag "{tag}" belongs on the note.\n\nTag description: {description}`
        },
        {
            prompt: `This is your final decision. Based on the note content, determine if this note should be tagged with "{tag}".`
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