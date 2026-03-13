export interface ModelConfig {
  model_name: string;
  api_key: string;
  api_base: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  choices: {
    index: number;
    delta: {
      content?: string;
    };
    finish_reason?: string;
  }[];
}

export interface AgentRequest {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface AgentResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export type ProviderType = "openai" | "anthropic" | "azure" | "custom";

export interface Provider {
  name: string;
  type: ProviderType;
  createCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  createStreamingCompletion(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void>;
}
