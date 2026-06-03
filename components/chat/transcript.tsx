interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export function ChatTranscript({ messages }: { messages: Message[] }) {
  return (
    <section className="flex-1 space-y-3 overflow-y-auto py-4">
      {messages
        .filter((m) => m.role !== "system")
        .map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[80%] rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                : "max-w-[80%] rounded-lg bg-muted px-3 py-2 text-foreground"
            }
          >
            {m.content}
          </div>
        ))}
    </section>
  );
}
