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
    aiProvider: 'vercel_gateway' | 'ollama' | 'openai'
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
    shouldTagDescription: string;
    confidenceDescription: string;
}

export interface TagOperation {
    id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
    notes: Array<{
        file: string;
        status: 'queued' | 'skipped' | 'no-change' | 'applied-tag' | 'removed-tag' | 'failed';
        error: any;
        tag: {
            name: string;
            description: string;
        }
    }>;
    config: Omit<Settings, 'tagDescriptions'>;
    metadata: {
        createdAt: number;
        startedAt?: number;
        completedAt?: number;
    };
}
