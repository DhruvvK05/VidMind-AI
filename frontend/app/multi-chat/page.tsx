"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import LoadingShell from "@/components/shared/loading-shell";
import AssistantMarkdown from "@/components/shared/assistant-markdown";
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
  Layers,
} from "lucide-react";

import { getWorkspace, multiChatWithVideos, ApiError } from "@/services/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { SourceReference, ChatMessage, WorkspaceVideo } from "@/types/chat";

const SELECTION_SESSION_KEY = "vidmind-multi-chat-selected";

function getMultiChatStorageKey(chatId: string): string {
  return `vidmind-multi-chat-${chatId}`;
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

function loadMultiChatMessages(chatId: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(getMultiChatStorageKey(chatId));
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

function saveMultiChatMessages(chatId: string, messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(
      getMultiChatStorageKey(chatId),
      JSON.stringify(messages)
    );
  } catch {
    // Ignore quota or serialization errors.
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
    <div
      className={`group flex gap-3.5 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
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
            {isUser ? "You" : "VidMind AI"}
          </p>

          {!isUser && (
            <button
              onClick={handleCopy}
              className="rounded-md p-1 opacity-60 transition-all hover:bg-white/5 hover:opacity-100 group-hover:opacity-100"
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
            <div className="mt-2 text-xs text-green-400">
              Copied ✓
            </div>
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
        <p className="text-xs font-semibold text-muted-foreground">VidMind AI</p>
        <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-white/5 bg-white/[0.02] backdrop-blur-md px-5 py-4">
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

function EmptyState({ selectedCount }: { selectedCount: number }) {
  return (
    <div className="dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-600/15 ring-1 ring-violet-500/20">
        <Layers className="size-8 text-violet-400" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
        Select at least 2 videos
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        {selectedCount === 0
          ? "Please select two or more videos from your workspace in the sidebar to start comparing them using AI."
          : `You currently have ${selectedCount} video selected. Select at least one more video in the workspace sidebar to begin.`}
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild className="gap-2 rounded-xl bg-violet-600 px-6 hover:bg-violet-500">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Go analyze a new video
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

export default function MultiChatPage() {
  const [workspaceVideos, setWorkspaceVideos] = useState<WorkspaceVideo[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [chatHydrated, setChatHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load workspace videos on mount
  useEffect(() => {
    async function loadWorkspace() {
      try {
        const response = await getWorkspace();
        setWorkspaceVideos(response.videos);

        const savedSelection = sessionStorage.getItem(SELECTION_SESSION_KEY);
        if (savedSelection) {
          const parsed = JSON.parse(savedSelection) as string[];
          const valid = parsed.filter((id) =>
            response.videos.some((v) => v.video_id === id)
          );
          setSelectedVideoIds(valid);
          sessionStorage.removeItem(SELECTION_SESSION_KEY);
        } else if (response.videos.length >= 2) {
          setSelectedVideoIds([
            response.videos[0].video_id,
            response.videos[1].video_id,
          ]);
        }
      } catch (err) {
            console.error("Failed to load workspace videos:", err);
      } finally {
        setChatHydrated(true);
        setIsReady(true);
      }
    }
    loadWorkspace();
  }, []);

  // Save selected video IDs to session storage
  useEffect(() => {
    if (chatHydrated) {
      sessionStorage.setItem(
        SELECTION_SESSION_KEY,
        JSON.stringify(selectedVideoIds)
      );
    }
  }, [selectedVideoIds, chatHydrated]);

  // Load chat history based on selected videos
  useEffect(() => {
    if (!chatHydrated || selectedVideoIds.length < 2) {
      setMessages([]);
      return;
    }
    const chatId = [...selectedVideoIds].sort().join("_");
    setMessages(loadMultiChatMessages(chatId));
  }, [selectedVideoIds, chatHydrated]);

  // Persist messages when they change
  useEffect(() => {
    if (!chatHydrated || selectedVideoIds.length < 2) {
      return;
    }
    const chatId = [...selectedVideoIds].sort().join("_");
    saveMultiChatMessages(chatId, messages);
  }, [messages, selectedVideoIds, chatHydrated]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleToggleVideo = (videoId: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  };

  const activeSources =
    messages.filter((m) => m.role === "assistant").at(-1)?.sources ?? [];

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || selectedVideoIds.length < 2 || isLoading) {
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
        const response = await multiChatWithVideos({
          video_ids: selectedVideoIds,
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
    [selectedVideoIds, isLoading]
  );

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  if (!isReady) {
    return <LoadingShell message="Preparing comparison workspace..." />;
  }

  const isChatting = selectedVideoIds.length >= 2;
  const selectedVideos = workspaceVideos.filter((video) =>
    selectedVideoIds.includes(video.video_id)
  );
  const visibleContextTitles = selectedVideos.slice(0, 5);
  const remainingContextCount = selectedVideos.length - visibleContextTitles.length;

  return (
    <div className="dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Ambient backgrounds */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-[400px] w-[600px] -translate-y-1/2 rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[500px] rounded-full bg-blue-600/6 blur-[100px]" />
      </div>

      {/* Main Header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600/20 ring-1 ring-violet-500/30">
            <Layers className="size-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">VidMind AI Workspace</p>
            <p className="text-xs text-muted-foreground">
              Multi-Video Comparison Research
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
            <Link href="/multi-chat" className="flex items-center gap-1.5">
              <Video className="size-3.5" />
              Multi Chat
            </Link>
          </Button>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <Sparkles className="size-3.5" />
            Comparison Mode
          </div>
        </div>
      </header>

      {/* Multi-Pane Workspace Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        
        {/* Left Pane: Workspace Selection Sidebar */}
        <aside className="flex min-h-0 max-h-[34vh] w-full shrink-0 flex-col border-b border-white/8 bg-background/40 lg:max-h-none lg:w-80 lg:border-r lg:border-b-0">
          <div className="shrink-0 border-b border-white/8 p-4">
            <h2 className="text-sm font-semibold text-foreground">Videos in Workspace</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select videos to compare details ({selectedVideoIds.length} checked)
            </p>
          </div>

          <ScrollArea className="flex-1 overflow-hidden">
            <div className="space-y-2 p-4">
              {workspaceVideos.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No videos analyzed yet.
                </div>
              ) : (
                workspaceVideos.map((video) => (
                  <label
                    key={video.video_id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedVideoIds.includes(video.video_id)
                        ? "border-violet-500/20 bg-violet-500/5 text-foreground"
                        : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedVideoIds.includes(video.video_id)}
                      onChange={() => handleToggleVideo(video.video_id)}
                      className="mt-0.5 size-4 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 focus:ring-opacity-25"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium leading-relaxed">
                        {video.title}
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Middle Pane: Chat Dialogue Screen */}
        <div className="flex min-h-0 flex-1 flex-col bg-background/10">
          {!isChatting ? (
            <EmptyState selectedCount={selectedVideoIds.length} />
          ) : (
            <>
              <div className="shrink-0 border-b border-white/8 px-4 py-4 sm:px-6">
                <div className="mx-auto max-w-3xl">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.015] px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          Comparing Videos
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          Ask questions that compare ideas across the selected videos.
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/20">
                        Videos Selected: {selectedVideos.length}
                      </span>
                    </div>
                    
                    <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
                      {selectedVideos.map((video) => (
                        <div
                          key={video.video_id}
                          className="flex items-center gap-2 text-sm text-foreground/95"
                        >
                          <Check className="size-3.5 shrink-0 text-violet-400" />
                          <span className="line-clamp-1 font-medium">{video.title}</span>
                        </div>
                      ))}
                    </div>
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
                          Ask anything about the selected videos
                        </p>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                          Ask for agreements, differences, or timeline comparisons across the active transcript set.
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
                <form
                  onSubmit={handleSend}
                  className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Textarea
                      placeholder="Compare the transcripts or ask a question..."
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
                          Comparing...
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
                    VidMind cross-references transcripts with citations.
                  </p>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Right Pane: Source Citations Sidebar */}
        {isChatting && (
          <aside className="flex min-h-0 max-h-[42vh] w-full shrink-0 flex-col border-t border-white/8 bg-background/40 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <div className="shrink-0 border-b border-white/8 px-4 py-4 sm:px-5">
              <h2 className="text-sm font-semibold">References</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Source snippets from the latest comparison response
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
                    No active citations yet.
                  </p>
                )}
              </div>
            </ScrollArea>
          </aside>
        )}

      </div>
    </div>
  );
}
