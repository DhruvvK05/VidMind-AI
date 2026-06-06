"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import LoadingShell from "@/components/shared/loading-shell";
import AssistantMarkdown from "@/components/shared/assistant-markdown";
import {
  ArrowLeft,
  Bot,
  ChevronRight,
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
    <div className={`group flex gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
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
        className={`space-y-1.5 ${
          isUser ? "max-w-[86%] sm:max-w-[72%]" : "max-w-[95%] sm:max-w-[80%]"
        } ${
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
          className={`rounded-2xl px-4 py-3.5 ${
            isUser
              ? "text-sm rounded-tr-md bg-violet-600/95 text-white shadow-sm shadow-violet-950/30"
              : "rounded-tl-md border border-white/5 bg-white/[0.02] backdrop-blur-md text-foreground shadow-sm sm:px-6 sm:py-5"
          }`}
        >
          {isUser ? (
            message.content.split("\n\n").map((paragraph, index) => (
              <p key={index} className={`leading-relaxed ${index > 0 ? "mt-3" : ""}`}>
                {paragraph}
              </p>
            ))
          ) : (
            <AssistantMarkdown content={message.content} />
          )}
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
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">VidMind</p>
        <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-white/5 bg-white/[0.02] backdrop-blur-md px-5 py-4">
          <Loader2 className="size-4 animate-spin text-violet-400" />
          <span className="text-sm text-muted-foreground">Thinking...</span>
        </div>
      </div>
    </div>
  );
}

function SuggestedQuestionsCards({
  questions,
  onQuestionClick,
  isLoading,
}: {
  questions: string[];
  onQuestionClick: (question: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-3 pb-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Suggested Questions
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {questions.map((question, index) => (
          <button
            key={`${index}-${question}`}
            type="button"
            disabled={isLoading}
            onClick={() => void onQuestionClick(question)}
            className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left transition-all hover:border-violet-500/20 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-violet-600/15 ring-1 ring-violet-500/20 transition-colors group-hover:bg-violet-600/25">
                <Sparkles className="size-3 text-violet-400" />
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
                {question}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SuggestedQuestionsCompact({
  questions,
  onQuestionClick,
  isLoading,
}: {
  questions: string[];
  onQuestionClick: (question: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="border-b border-white/8 px-4 py-3 sm:px-6 transition-all duration-300">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Continue with
        </p>
        <div className="mt-2 flex overflow-x-auto pb-2 sm:pb-0 scrollbar-none sm:flex-wrap gap-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {questions.map((question, index) => (
            <button
              key={`${index}-${question}`}
              type="button"
              disabled={isLoading}
              onClick={() => void onQuestionClick(question)}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.015] px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-violet-500/20 hover:bg-violet-500/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              title={question}
            >
              <span className="truncate max-w-[240px] sm:max-w-none">{question}</span>
              <ChevronRight className="size-3 shrink-0 opacity-40 transition-opacity group-hover:opacity-85" />
            </button>
          ))}
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
    <article className="rounded-xl border border-white/5 bg-white/[0.015] p-3 transition-colors hover:border-white/10 hover:bg-white/[0.025]">
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-foreground/90">
          {source.video_title}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300 ring-1 ring-violet-500/20">
          {source.timestamp}
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground/80">
        {source.preview}
      </p>
      {timestampUrl ? (
        <a
          href={timestampUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-violet-400 transition-colors hover:text-violet-300 hover:underline"
        >
          Open at timestamp
          <ExternalLink className="size-3" />
        </a>
      ) : (
        <p className="mt-2.5 text-[11px] text-muted-foreground/60">
          Timestamp link unavailable
        </p>
      )}
    </article>
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

  const hasUserMessages = messages.some((m) => m.role === "user");

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

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-4 sm:px-6">
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
        <div className="flex items-center gap-1.5 sm:gap-3">
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

      <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden lg:flex-row">
        {/* Chat Messages Section */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-white/8 px-4 py-3 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Video context
                </p>
                <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground">
                  {videoTitle}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Grounded answers come from this transcript, with source references shown alongside each response.
                </p>
              </div>
            </div>
          </div>
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
                      Ask for summaries, comparisons, timelines, or key quotes from the active video context.
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

          {/* Suggested Questions - Large Cards (before first message) */}
          {!hasUserMessages && suggestedQuestions.length > 0 && (
            <div className="shrink-0 border-b border-white/8 px-4 py-6 sm:px-6 transition-all duration-300">
              <SuggestedQuestionsCards
                questions={suggestedQuestions}
                onQuestionClick={sendMessage}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Input Area - Sticky Bottom */}
          <div className="shrink-0 border-t border-white/8 bg-background/80 backdrop-blur-sm">
            {/* Suggested Follow-Ups Section - Compact (after first message) */}
            {hasUserMessages && suggestedQuestions.length > 0 && (
              <SuggestedQuestionsCompact
                questions={suggestedQuestions}
                onQuestionClick={sendMessage}
                isLoading={isLoading}
              />
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
        <aside className="flex min-h-0 max-h-[42vh] w-full shrink-0 flex-col border-t border-white/8 bg-background/35 lg:max-h-none lg:w-96 lg:border-t-0 lg:border-l">
          <div className="shrink-0 border-b border-white/8 px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold">References</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Source snippets from the most recent assistant answer
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
