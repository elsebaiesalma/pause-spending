import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

// The SDK's own retry behavior already matches this project's policy for
// every external call: exponential backoff with jitter, honors
// `Retry-After` when the API sends one, and only retries connection
// errors/408/409/429/5xx - never a plain 4xx, which retrying could never
// fix. `maxRetries` is set explicitly (rather than left at the SDK
// default) so that policy is a deliberate, visible choice here.
export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ maxRetries: 3 });
  }
  return client;
}
