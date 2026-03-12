export interface Serialized {
    settings: Settings;
    operations: Array<TagOperation>;
}

export interface Settings {
    tagDescriptions: Array<{
        name: string;
        description: string;
    }>;
    confidenceThreshold: number;
    reasoningSteps: Array<{
        prompt: string;
    }>;
    temperature: number;
    maxTokens: number;
    contextClamping: {
        enabled: boolean;
        maxContentLength: number;
        truncationStrategy: 'beginning' | 'end';
    };
    tagsPerRequest: number,
    aiProvider: 'vercel_gateway' | 'ollama' | 'openai' | 'open_router' | 'mistral'
    openaiSettings: {
        baseUrl: string,
        apiKey: string,
        modelId: string
    };
    gatewaySettings: {
        baseUrl: string,
        apiKey: string,
        modelId: string
    };
    ollamaSettings: {
        baseUrl: string,
        modelId: string
    };
    openRouterSettings: {
        baseUrl: string,
        apiKey: string,
        modelId: string
    };
    mistralSettings: {
        baseUrl: string,
        apiKey: string,
        modelId: string
    };
    shouldTagDescription: string;
    confidenceDescription: string;
}

export interface TagOperation {
    id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
    tags: Array<{
        name: string;
        description: string;
    }>;
    steps: Array<{
        file: string;
        status: 'queued' | 'done' | 'failed';
        tags: Array<number>;
        tagOutcomes: Partial<Record<string, 'skipped' | 'no-change' | 'applied-tag' | 'removed-tag' | 'failed'>>;
        error: any;
    }>;
    config: Omit<Settings, 'tagDescriptions'>;
    metadata: {
        createdAt: number;
        startedAt?: number;
        completedAt?: number;
    };
}
