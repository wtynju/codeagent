// Mock LLM Provider
// 测试用，可以预设响应，不发出真实网络请求

import { LLMProvider, LLMResponse, LLMOptions, Message } from './provider';

export class MockLLMProvider implements LLMProvider {
  name = 'mock';
  private responses: LLMResponse[] = [];
  private responseIndex = 0;
  private history: { messages: Message[]; options?: LLMOptions }[] = [];

  setNextResponse(response: LLMResponse): void {
    this.responses.push(response);
  }

  setNextResponses(responses: LLMResponse[]): void {
    this.responses.push(...responses);
  }

  getHistory(): { messages: Message[]; options?: LLMOptions }[] {
    return [...this.history];
  }

  reset(): void {
    this.responses = [];
    this.responseIndex = 0;
    this.history = [];
  }

  async complete(messages: Message[], options?: LLMOptions): Promise<LLMResponse> {
    this.history.push({ messages: [...messages], options });

    if (this.responseIndex >= this.responses.length) {
      return {
        content: '',
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0 },
      };
    }

    const response = this.responses[this.responseIndex];
    this.responseIndex++;
    return response;
  }
}