import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createConversation,
  deleteConversation,
  emptyMemory,
  isPlaceholderChat,
  selectConversation,
  startNewChat,
  titleFromMessages,
  toMemoryMessages,
  upsertActiveMessages,
} from "./chat-memory.ts";

describe("chat-memory", () => {
  it("titles chats from the first user message", () => {
    assert.equal(titleFromMessages([]), "New chat");
    assert.equal(
      titleFromMessages([
        { id: "welcome", role: "assistant", content: "hi" },
        { id: "u1", role: "user", content: "Best Coda Hema steel path build" },
      ]),
      "Best Coda Hema steel path build",
    );
    assert.match(
      titleFromMessages([
        {
          id: "u1",
          role: "user",
          content: "A".repeat(80),
        },
      ]),
      /…$/,
    );
  });

  it("strips image payloads and caps message history", () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      id: `m${i}`,
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `msg ${i}`,
      imageUrl: "data:image/jpeg;base64,AAA",
      toolsUsed: i === 99 ? ["lookup_local_knowledge"] : undefined,
    }));
    const stored = toMemoryMessages(many);
    assert.equal(stored.length, 80);
    assert.equal("imageUrl" in stored[0]!, false);
    assert.deepEqual(stored.at(-1)?.toolsUsed, ["lookup_local_knowledge"]);
  });

  it("upserts, switches, starts new, and deletes conversations", () => {
    let memory = emptyMemory();
    const firstId = memory.activeId;
    memory = upsertActiveMessages(memory, [
      { id: "welcome", role: "assistant", content: "hi" },
      { id: "u1", role: "user", content: "fissures" },
      { id: "a1", role: "assistant", content: "here" },
    ]);
    assert.equal(memory.conversations[0]?.title, "fissures");
    assert.equal(isPlaceholderChat(memory.conversations[0]!.messages), false);

    memory = startNewChat(memory);
    assert.notEqual(memory.activeId, firstId);
    assert.equal(memory.conversations.length, 2);

    const older = memory.conversations.find((c) => c.id === firstId)!;
    memory = selectConversation(memory, older.id);
    assert.equal(memory.activeId, older.id);

    memory = deleteConversation(memory, older.id);
    assert.equal(memory.conversations.some((c) => c.id === older.id), false);
    assert.ok(memory.conversations.length >= 1);
  });

  it("reuses an empty active chat instead of spawning duplicates", () => {
    const memory = emptyMemory();
    const again = startNewChat(memory);
    assert.equal(again.activeId, memory.activeId);
    assert.equal(again.conversations.length, 1);
    assert.ok(createConversation().id);
  });
});
