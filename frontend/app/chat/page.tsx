"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import LoadingShell from "@/components/shared/loading-shell";
import {
  ArrowLeft,
  Bot,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Send,
  Sparkles,
  User,
  Video,
  VideoOff,
} from "lucide-react";

import { chatWithVideo, ApiError } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { SourceReference } from "@/types/chat";
import type { AnalyzeVideoResponse } from "@/types/video";

const ANALYSIS_SESSION_KEY = "vidmind-analysis";

function getChatStorageKey(videoId: string): string {
  return `vidmind-chat-${videoId}`;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
}

function isValidSourceReference(value: unknown): value is SourceReference {
  if (!value || typeof value !== "object") {
    return false;
  }

  const source = value as Record<string, unknown>;

  return (
    typeof source.video_title === "string" &&
    typeof source.timestamp === "string" &&
    typeof source.preview === "string" &&
    typeof source.start_seconds === "number" &&
    typeof source.end_seconds === "number" &&
    typeof source.video_url === "string"
  );
}

function isValidChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;

  if (
    typeof message.id !== "string" ||
    typeof message.content !== "string" ||
    (message.role !== "user" && message.role !== "assistant")
  ) {
    return false;
  }

  if (message.sources !== undefined) {
    if (
      !Array.isArray(message.sources) ||
      !message.sources.every(isValidSourceReference)
    ) {
      return false;
    }
  }

  return true;
}

function loadChatMessages(videoId: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(getChatStorageKey(videoId));
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidChatMessage);
  } catch {
    return [];
  }
}

function saveChatMessages(videoId: string, messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(
      getChatStorageKey(videoId),
      JSON.stringify(messages)
    );
  } catch {
    // Ignore quota or serialization errors.
  }
}

function parseAnalysis(
  raw: string
): Pick<AnalyzeVideoResponse, "video_id" | "title" | "suggested_questions"> | null {
  try {
    const data = JSON.parse(raw) as AnalyzeVideoResponse;

    if (typeof data.video_id !== "string" || typeof data.title !== "string") {
      return null;
    }

    const suggested_questions = Array.isArray(data.suggested_questions)
      ? data.suggested_questions.filter(
          (question): question is string =>
            typeof question === "string" && question.trim().length > 0
        )
      : [];

    return {
      video_id: data.video_id,
      title: data.title,
      suggested_questions,
    };
  } catch {
    return null;
  }
}

function buildHistory(messages: ChatMessage[]): string {
  let history = "";

  for (const message of messages) {
    if (message.role === "user") {
      history += `\nUser: ${message.content}`;
    } else {
      history += `\nAssistant: ${message.content}`;
    }
  }

  return history;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy message");
    }
  };

  return (
      <div className={`group flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ${
          isUser
            ? "bg-violet-600/20 ring-violet-500/30"
            : "bg-white/5 ring-white/10"
        }`}
      >
        {isUser ? (
          <User className="size-4 text-violet-400" />
        ) : (
          <Bot className="size-4 text-muted-foreground" />
        )}
      </div>

      <div
        className={`max-w-[85%] space-y-1 sm:max-w-[75%] ${
          isUser ? "text-right" : "text-left"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground">
            {isUser ? "You" : "VidMind"}
          </p>
          {!isUser && (
            <button
              onClick={handleCopy}
              className="rounded-md p-1 transition-all opacity-60 hover:opacity-100 group-hover:opacity-100 hover:bg-white/5"
              title="Copy response"
            >
              {copied ? (
                <Check className="size-4 text-green-400" />
              ) : (
                <Copy className="size-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-md bg-violet-600 text-white"
              : "rounded-tl-md border border-white/8 bg-white/[0.04] text-foreground"
          }`}
        >
          {message.content.split("\n\n").map((paragraph, index) => (
            <p key={index} className={index > 0 ? "mt-3" : undefined}>
              {paragraph}
            </p>
          ))}
          {!isUser && copied && (
            <div className="mt-2 text-xs text-green-400">Copied ✓</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
        <Bot className="size-4 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">VidMind</p>
        <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-white/8 bg-white/[0.04] px-4 py-3">
          <Loader2 className="size-4 animate-spin text-violet-400" />
          <span className="text-sm text-muted-foreground">Thinking...</span>
        </div>
      </div>
    </div>
  );
}

function SourceCard({ source }: { source: SourceReference }) {
  const timestampUrl = source.video_url
    ? `${source.video_url}&t=${source.start_seconds}s`
    : null;

  return (
    <Card className="border-white/8 bg-white/[0.03] py-4 ring-white/10">
      <CardHeader className="gap-2 px-4">
        <CardTitle className="line-clamp-1 text-sm font-medium">
          {source.video_title}
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-xs">
          <Clock className="size-3" />
          {source.timestamp}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {source.preview}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
          disabled={!timestampUrl}
          asChild={!!timestampUrl}
        >
          {timestampUrl ? (
            <a
              href={timestampUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Jump To Moment
              <ExternalLink className="size-3.5" />
            </a>
          ) : (
            <>
              Jump To Moment
              <ExternalLink className="size-3.5" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-600/15 ring-1 ring-violet-500/20">
          <VideoOff className="size-8 text-violet-400" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          No video to chat with
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Analyze a video from the homepage first, then you can ask questions
          about its content here.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild className="gap-2 rounded-xl bg-violet-600 px-6 hover:bg-violet-500">
            <Link href="/analyze">
              <ArrowLeft className="size-4" />
              Back to Analysis
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 rounded-xl border-white/10 bg-white/[0.02] hover:bg-white/[0.03]">
            <Link href="/workspace">Back to Workspace</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [chatHydrated, setChatHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(ANALYSIS_SESSION_KEY);
    const analysis = raw ? parseAnalysis(raw) : null;

    if (analysis) {
      setVideoId(analysis.video_id);
      setVideoTitle(analysis.title);
      setSuggestedQuestions(analysis.suggested_questions);
      setMessages(loadChatMessages(analysis.video_id));
    }

    setChatHydrated(true);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!videoId || !chatHydrated) {
      return;
    }

    saveChatMessages(videoId, messages);
  }, [messages, videoId, chatHydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const activeSources =
    messages.filter((m) => m.role === "assistant").at(-1)?.sources ?? [];

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || !videoId || isLoading) {
        return;
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };

      let history = "";

      setMessages((prev) => {
        history = buildHistory(prev);
        return [...prev, userMessage];
      });

      setError(null);
      setIsLoading(true);

      try {
        const response = await chatWithVideo({
          video_id: videoId,
          question: trimmed,
          history,
        });

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          sources: response.sources,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setInput("");
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Something went wrong. Please try again.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [videoId, isLoading]
  );

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  if (!isReady) {
    return <LoadingShell message="Loading chat context..." />;
  }

  if (!videoId) {
    return <EmptyState />;
  }

  return (
    <div className="dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-[400px] w-[600px] -translate-y-1/2 rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[500px] rounded-full bg-blue-600/6 blur-[100px]" />
      </div>

      <header className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600/20 ring-1 ring-violet-500/30">
            <Video className="size-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">VidMind</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {videoTitle}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
            <Link href="/">Home</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
            <Link href="/workspace">Workspace</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
            <Link href="/multi-chat">Multi Chat</Link>
          </Button>
          <div className="hidden items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300 sm:inline-flex">
            <Sparkles className="size-3.5" />
            Video Chat
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden lg:flex-row flex-col">
        {/* Chat Messages Section */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Messages Scroll Area */}
          <ScrollArea className="flex-1 overflow-hidden">
            <div className="px-4 sm:px-6">
              <div className="mx-auto max-w-3xl space-y-8 py-6">
                {messages.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-violet-600/15 ring-1 ring-violet-500/20">
                      <Sparkles className="size-5 text-violet-400" />
                    </div>
                    <p className="mt-4 text-sm font-medium">
                      Ask anything about this video
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Your answers will be grounded in the transcript with source
                      citations on the right.
                    </p>
                  </div>
                )}

                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}

                {isLoading && <LoadingBubble />}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </ScrollArea>

          {/* Input Area - Sticky Bottom */}
          <div className="shrink-0 border-t border-white/8 bg-background/80 backdrop-blur-sm">
            {/* Suggested Follow-Ups Section */}
            {suggestedQuestions.length > 0 && (
              <div className="border-b border-white/8 px-4 py-3 sm:px-6">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggested Follow-Ups
                </p>
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={`${index}-${question}`}
                        type="button"
                        disabled={isLoading}
                        onClick={() => void sendMessage(question)}
                        className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        title={question}
                      >
                        <span className="line-clamp-1">{question}</span>
                        <Send className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Textarea
                  placeholder="Ask a question about this video..."
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  className="min-h-[52px] max-h-32 resize-none rounded-xl border-white/10 bg-white/5 px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20"
                  rows={1}
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading || !input.trim()}
                  className="h-[52px] shrink-0 gap-2 rounded-xl bg-violet-600 px-8 font-medium hover:bg-violet-500 sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send
                      <Send className="size-4" />
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <p className="mt-3 text-center text-sm text-red-400">{error}</p>
              )}
              <p className="mt-2 text-center text-xs text-muted-foreground/70">
                Answers are grounded in the video transcript with source
                citations.
              </p>
            </form>
          </div>
        </div>

        {/* Sources Sidebar */}
        <aside className="flex min-h-0 w-full shrink-0 flex-col border-t border-white/8 lg:w-96 lg:border-t-0 lg:border-l">
          <div className="shrink-0 border-b border-white/8 px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold">Sources</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Grounded references from the latest response
            </p>
          </div>

          <ScrollArea className="flex-1 overflow-hidden">
            <div className="space-y-3 p-4 sm:p-5">
              {activeSources.length > 0 ? (
                activeSources.map((source, index) => (
                  <SourceCard
                    key={`${source.timestamp}-${source.start_seconds}-${index}`}
                    source={source}
                  />
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No sources available yet.
                </p>
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
