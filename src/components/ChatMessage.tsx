import { Bot, User } from "lucide-react"

export interface ChatMsg {
  id: string
  role: "user" | "assistant"
  content: string
}

export function ChatMessage({ message }: { message: ChatMsg }) {
  const isUser = message.role === "user"

  return (
    <div className="flex items-start gap-3">
      <div
        className={
          "flex size-8 shrink-0 items-center justify-center rounded-full " +
          (isUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")
        }
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {isUser ? "Vous" : "Nova"}
        </p>
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
          {message.content}
        </div>
      </div>
    </div>
  )
}
