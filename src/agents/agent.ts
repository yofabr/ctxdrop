import { createProvider } from "./providers.js";
import type { AgentRequest, AgentResponse, ChatMessage, ModelConfig, Provider } from "./types.js";

export class Agent {
  private provider: Provider;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: ModelConfig) {
    this.provider = createProvider("openai", config.api_key, config.api_base);
    this.model = config.model_name;
    this.defaultTemperature = 0.7;
    this.defaultMaxTokens = 4096;
  }

  async chat(request: AgentRequest): Promise<AgentResponse> {
    const response = await this.provider.createCompletion({
      model: this.model,
      messages: request.messages,
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.max_tokens ?? this.defaultMaxTokens,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error("No response choices returned");
    }

    return {
      content: choice.message.content,
      usage: response.usage
        ? {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async chatStream(request: AgentRequest, onChunk: (chunk: string) => void): Promise<void> {
    await this.provider.createStreamingCompletion(
      {
        model: this.model,
        messages: request.messages,
        temperature: request.temperature ?? this.defaultTemperature,
        max_tokens: request.max_tokens ?? this.defaultMaxTokens,
        stream: true,
      },
      onChunk,
    );
  }

  async chatWithSystemPrompt(userMessage: string, systemPrompt?: string): Promise<AgentResponse> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userMessage });

    return this.chat({ messages });
  }
}

export function createAgent(config: ModelConfig): Agent {
  return new Agent(config);
}
