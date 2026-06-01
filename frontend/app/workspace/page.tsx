"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  MessageSquare,
  Trash2,
  Video,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  FileVideo,
} from "lucide-react";

import { getWorkspace, getVideoDetails, deleteVideo, ApiError } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WorkspaceVideo } from "@/types/chat";

const ANALYSIS_SESSION_KEY = "vidmind-analysis";
const SELECTION_SESSION_KEY = "vidmind-multi-chat-selected";

export default function WorkspacePage() {
  const router = useRouter();
  const [videos, setVideos] = useState<WorkspaceVideo[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspace videos on mount
  useEffect(() => {
    async function fetchWorkspace() {
      setError(null);
      try {
        const response = await getWorkspace();
        setVideos(response.videos);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to fetch workspace videos.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchWorkspace();
  }, []);

  // Handle card selection toggle
  const handleToggleSelect = (videoId: string) => {
    setSelectedIds((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  };

  // Open Analysis: Fetch details, save in sessionStorage, navigate
  const handleOpenAnalysis = async (videoId: string) => {
    setActionLoadingId(videoId);
    setError(null);
    try {
      const details = await getVideoDetails(videoId);
      sessionStorage.setItem(ANALYSIS_SESSION_KEY, JSON.stringify(details));
      router.push("/analyze");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to load video details.";
      setError(message);
      setActionLoadingId(null);
    }
  };

  // Open Chat: Fetch details, save in sessionStorage, navigate
  const handleOpenChat = async (videoId: string) => {
    setActionLoadingId(videoId);
    setError(null);
    try {
      const details = await getVideoDetails(videoId);
      sessionStorage.setItem(ANALYSIS_SESSION_KEY, JSON.stringify(details));
      router.push("/chat");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to load video details.";
      setError(message);
      setActionLoadingId(null);
    }
  };

  // Delete video: Call API, remove card instantly
  const handleDelete = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video from your workspace? This will remove its transcript and vector database context.")) {
      return;
    }
    setError(null);
    // Optimistic UI updates
    const previousVideos = [...videos];
    setVideos((prev) => prev.filter((v) => v.video_id !== videoId));
    setSelectedIds((prev) => prev.filter((id) => id !== videoId));

    try {
      await deleteVideo(videoId);
    } catch (err) {
      // Revert on error
      setVideos(previousVideos);
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to delete video.";
      setError(message);
    }
  };

  // Start Multi Video Chat: Save selection, navigate
  const handleCompare = () => {
    if (selectedIds.length < 2) return;
    sessionStorage.setItem(SELECTION_SESSION_KEY, JSON.stringify(selectedIds));
    router.push("/multi-chat");
  };

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient backgrounds */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[350px] w-[500px] translate-x-1/4 translate-y-1/4 rounded-full bg-blue-600/8 blur-[100px]" />
      </div>

      {/* Main Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600/20 ring-1 ring-violet-500/30">
            <Video className="size-4 text-violet-400" />
          </div>
          <span className="text-sm font-semibold tracking-tight">VidMind</span>
        </div>

        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </Button>
      </header>

      {/* Action Overlay */}
      {actionLoadingId && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/90 p-8 shadow-2xl">
            <Loader2 className="size-8 animate-spin text-violet-400" />
            <p className="text-sm font-medium text-foreground">Fetching video context...</p>
            <p className="text-xs text-muted-foreground">Preparing workspace details</p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 pb-20 sm:px-8">
        {/* Workspace Title Area */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              <Layers className="size-3.5" />
              Workspace Dashboard
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Analyzed Video Library
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Select videos to compare, view details, chat, or manage your active RAG models.
            </p>
          </div>

          {videos.length >= 2 && (
            <Button
              onClick={handleCompare}
              disabled={selectedIds.length < 2}
              className="gap-2 rounded-xl bg-violet-600 px-6 font-medium hover:bg-violet-500"
            >
              <Sparkles className="size-4" />
              Compare Selected ({selectedIds.length})
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Workspace Loaders & Card Grid */}
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-violet-400" />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
            <FileVideo className="size-12 text-muted-foreground/60" />
            <h2 className="mt-4 text-xl font-semibold">No analyzed videos yet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Paste a YouTube URL on the homepage first to build summaries and enable RAG chat models.
            </p>
            <Button asChild className="mt-6 gap-2 rounded-xl bg-violet-600 hover:bg-violet-500">
              <Link href="/">
                Go Analyze a Video
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => {
              const isSelected = selectedIds.includes(video.video_id);
              return (
                <Card
                  key={video.video_id}
                  className={`group relative flex flex-col justify-between border-white/8 bg-white/[0.03] transition-all hover:border-violet-500/25 hover:bg-white/[0.05] ${
                    isSelected ? "border-violet-500/30 ring-1 ring-violet-500/20 bg-violet-500/[0.02]" : ""
                  }`}
                >
                  <CardHeader className="p-5 pb-3">
                    {/* Top Select Toggle */}
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
                        {video.title}
                      </CardTitle>
                      
                      <button
                        onClick={() => handleToggleSelect(video.video_id)}
                        className={`size-6 flex shrink-0 items-center justify-center rounded-md border transition-all ${
                          isSelected
                            ? "border-violet-500 bg-violet-600 text-white"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/30"
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="size-3.5" />
                        ) : (
                          <Square className="size-3.5 opacity-0 group-hover:opacity-100" />
                        )}
                      </button>
                    </div>

                    <CardDescription className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                      ID: {video.video_id}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-5 pb-5 pt-3 border-t border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-1">
                      {/* Open Analysis Action */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenAnalysis(video.video_id)}
                        className="flex-1 gap-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      >
                        <BookOpen className="size-3.5" />
                        Summary
                      </Button>

                      {/* Chat Action */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenChat(video.video_id)}
                        className="flex-1 gap-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      >
                        <MessageSquare className="size-3.5" />
                        Chat
                      </Button>

                      {/* Delete Action */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(video.video_id)}
                        className="size-9 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
