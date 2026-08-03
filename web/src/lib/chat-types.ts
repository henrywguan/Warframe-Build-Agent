export type ChatRole = "user" | "assistant";

export type TextContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/** Wire format sent to /api/chat — content may be plain text or multimodal parts. */
export interface IncomingChatMessage {
  role: ChatRole;
  content: string | TextContentPart[];
}

export function messageText(content: string | TextContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((part): part is Extract<TextContentPart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function messageImages(content: string | TextContentPart[]): string[] {
  if (typeof content === "string") return [];
  return content
    .filter(
      (part): part is Extract<TextContentPart, { type: "image_url" }> =>
        part.type === "image_url",
    )
    .map((part) => part.image_url.url)
    .filter(Boolean);
}

export function hasImages(messages: IncomingChatMessage[]): boolean {
  return messages.some((message) => messageImages(message.content).length > 0);
}
