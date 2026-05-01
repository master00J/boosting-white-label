export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AICompletionOptions = {
  messages: AIMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

export type AICompletionResult = {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export interface AIProvider {
  complete(options: AICompletionOptions): Promise<AICompletionResult>;
  name: string;
}
