"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Clock,
  ExternalLink,
  Loader2,
  Send,
  Sparkles,
  User,
  Video,
  VideoOff,
  Layers,
} from "lucide-react";

import { getWorkspace, multiChatWithVideos, ApiError } from "@/services/api";
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

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
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
        <p className="text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "VidMind AI"}
        </p>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed sm:text-base ${
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
        <p className="text-xs font-medium text-muted-foreground">VidMind AI</p>
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
        <CardTitle className="line-clamp-2 text-sm font-medium leading-snug">
          {source.video_title}
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-xs text-violet-400">
          <Clock className="size-3 text-violet-400" />
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

function EmptyState({ selectedCount }: { selectedCount: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
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
      <Button
        asChild
        className="mt-8 gap-2 rounded-xl bg-violet-600 px-6 hover:bg-violet-500"
      >
        <Link href="/">
          <ArrowLeft className="size-4" />
          Go analyze a new video
        </Link>
      </Button>
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
    return null;
  }

  const isChatting = selectedVideoIds.length >= 2;

  return (
    <div className="dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Ambient backgrounds */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-[400px] w-[600px] -translate-y-1/2 rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[500px] rounded-full bg-blue-600/6 blur-[100px]" />
      </div>

      {/* Main Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600/20 ring-1 ring-violet-500/30">
            <Layers className="size-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">VidMind AI Workspace</p>
            <p className="text-xs text-muted-foreground">
              Multi-Video Comparison Research
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
            <Link href="/chat" className="flex items-center gap-1.5">
              <Video className="size-3.5" />
              Single Chat
            </Link>
          </Button>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <Sparkles className="size-3.5" />
            Comparison Mode
          </div>
        </div>
      </header>

      {/* Multi-Pane Workspace Body */}
      <div className="flex min-h-0 flex-1 flex-row">
        
        {/* Left Pane: Workspace Selection Sidebar */}
        <aside className="flex min-h-0 w-80 shrink-0 flex-col border-r border-white/8 bg-background/40">
          <div className="shrink-0 border-b border-white/8 p-4">
            <h2 className="text-sm font-semibold text-foreground">Videos in Workspace</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select videos to compare details ({selectedVideoIds.length} checked)
            </p>
          </div>

          <ScrollArea className="flex-1">
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
              <ScrollArea className="flex-1 px-4 sm:px-6">
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
                        Your answers will be cross-referenced across the transcripts of all checked videos.
                      </p>
                    </div>
                  )}

                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}

                  {isLoading && <LoadingBubble />}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="shrink-0 border-t border-white/8 bg-background/80 p-4 backdrop-blur-sm sm:p-6">
                <form
                  onSubmit={handleSend}
                  className="mx-auto max-w-3xl"
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
                      className="min-h-[52px] max-h-32 resize-none rounded-xl border-white/10 bg-white/5 px-4 py-3 text-base placeholder:text-muted-foreground/60 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20"
                      rows={1}
                    />
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isLoading || !input.trim()}
                      className="h-[52px] shrink-0 gap-2 rounded-xl bg-violet-600 px-6 hover:bg-violet-500 sm:w-auto"
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
          <aside className="flex min-h-0 w-80 shrink-0 flex-col border-l border-white/8 bg-background/40">
            <div className="shrink-0 border-b border-white/8 px-4 py-4 sm:px-5">
              <h2 className="text-sm font-semibold">Grounded Sources</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Citations retrieved for the last message
              </p>
            </div>

            <ScrollArea className="flex-1">
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
