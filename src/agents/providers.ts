import type { ChatCompletionRequest, ChatCompletionResponse, Provider, ProviderType } from "./types.js";

export class OpenAIProvider implements Provider {
  name = "OpenAI";
  type = "openai" as const;

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://api.openai.com/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async createCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<ChatCompletionResponse>;
  }

  async createStreamingCompletion(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}

export class AnthropicProvider implements Provider {
  name = "Anthropic";
  type = "anthropic" as const;

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(apiKey: string, baseUrl = "https://api.anthropic.com", model = "claude-3-5-sonnet-20241022") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.defaultModel = model;
  }

  private convertMessages(messages: ChatMessage[]): { role: string; content: string }[] {
    return messages.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : msg.role === "system" ? "user" : msg.role,
      content: msg.content,
    }));
  }

  async createCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const model = request.model || this.defaultModel;
    const messages = this.convertMessages(request.messages);

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      id: string;
      model: string;
      content: { type: string; text: string }[];
      usage: { input_tokens: number; output_tokens: number };
    };

    const content = data.content[0]?.text || "";

    return {
      id: data.id,
      model: data.model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }

  async createStreamingCompletion(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const model = request.model || this.defaultModel;
    const messages = this.convertMessages(request.messages);

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "streaming-2025-01-08",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta") {
              const content = parsed.delta?.text;
              if (content) {
                onChunk(content);
              }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}

export class AzureProvider implements Provider {
  name = "Azure OpenAI";
  type = "azure" as const;

  private apiKey: string;
  private endpoint: string;
  private deployment: string;
  private apiVersion: string;

  constructor(apiKey: string, endpoint: string, deployment: string, apiVersion = "2024-02-15") {
    this.apiKey = apiKey;
    this.endpoint = endpoint.replace(/\/$/, "");
    this.deployment = deployment;
    this.apiVersion = apiVersion;
  }

  async createCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.apiKey,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<ChatCompletionResponse>;
  }

  async createStreamingCompletion(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.apiKey,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure API error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}

export function createProvider(type: ProviderType, apiKey: string, baseUrl?: string, extra?: Record<string, string>): Provider {
  switch (type) {
    case "openai":
      return new OpenAIProvider(apiKey, baseUrl);
    case "anthropic":
      return new AnthropicProvider(apiKey, baseUrl);
    case "azure":
      if (!extra?.deployment || !extra?.endpoint) {
        throw new Error("Azure provider requires endpoint and deployment");
      }
      return new AzureProvider(apiKey, extra.endpoint, extra.deployment, extra.apiVersion);
    case "custom":
      return new OpenAIProvider(apiKey, baseUrl);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
