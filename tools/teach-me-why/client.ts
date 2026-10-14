import OpenAI from "openai";
import type { Config } from "./types";

export interface ModelInfo {
  id: string;
  /** Any digest or version the service reports on the model entry, else null */
  digest: string | null;
}

export interface CompletionRequest {
  system: string;
  user: string;
  seed: number;
  maxTokens: number;
  schema: Record<string, unknown>;
}

export interface CompletionReply {
  content: string;
  finishReason: string | null;
  totalTokens: number;
}

/** The only door to the service, the reasoning text is never read */
export interface GenAiClient {
  listModels: () => Promise<ModelInfo[]>;
  complete: (request: CompletionRequest) => Promise<CompletionReply>;
}

const DIGEST_FIELDS = ["digest", "version", "sha256"];

export function createClient(config: Config): GenAiClient {
  // The retry here is ours so a 429 is counted and waited on in one place
  const api = new OpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey, maxRetries: 0 });
  return {
    async listModels() {
      const found: ModelInfo[] = [];
      for await (const model of api.models.list()) {
        const fields = model as unknown as Record<string, unknown>;
        const field = DIGEST_FIELDS.find((name) => typeof fields[name] === "string");
        found.push({ id: model.id, digest: field ? String(fields[field]) : null });
      }
      return found;
    },
    async complete(request) {
      const reply = await api.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user }
        ],
        temperature: 0,
        seed: request.seed,
        max_tokens: request.maxTokens,
        reasoning_effort: "low",
        response_format: {
          type: "json_schema",
          json_schema: { name: "explanation", strict: true, schema: request.schema }
        }
      });
      const choice = reply.choices[0];
      return {
        content: choice?.message.content ?? "",
        finishReason: choice?.finish_reason ?? null,
        totalTokens: reply.usage?.total_tokens ?? 0
      };
    }
  };
}
