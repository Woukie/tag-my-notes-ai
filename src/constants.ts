import { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
    openAIApiKey: '',
    openAIModel: 'gpt-4o-mini',
    tagDescriptions: [{ name: "online_resource", description: "Very broad category, applying to every note that focuses on an online resource" }],
    confidenceThreshold: 0.7,
    reasoningSteps: [
        {
            prompt: `Take a look at the note. Discuss what the note is about and whether the tag "{tag}" belongs on the note.

Tag description: {description}`
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
        truncationStrategy: 'beginning'
    },
    responseFormat: 'structured_outputs',
    functionDescription: 'Record whether a note should be tagged and with what confidence',
    shouldTagDescription: "Whether the note should have this tag",
    confidenceDescription: "Confidence level from 0 to 1",
};

export const OPENAI_MODELS = {
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'gpt-4': 'GPT-4',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo-preview': 'GPT-4 Turbo'
} as const;