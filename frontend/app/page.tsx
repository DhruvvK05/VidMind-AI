"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Check,
  Clock,
  Layers,
  Link2,
  Loader2,
  MessageSquare,
  Play,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";

import { analyzeVideo, uploadVideo, ApiError } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const features = [
  {
    icon: Sparkles,
    title: "AI Summaries",
    description:
      "Instantly generate concise summaries, key takeaways, and important concepts from any video.",
  },
  {
    icon: MessageSquare,
    title: "Video Chat",
    description:
      "Ask questions and chat with your video using RAG-powered intelligence that understands context.",
  },
  {
    icon: Layers,
    title: "Multi-Video Intelligence",
    description:
      "Chat across multiple videos at once. Compare, synthesize, and explore insights at scale.",
  },
  {
    icon: Clock,
    title: "Source Grounding",
    description:
      "Every answer is backed by source-grounded citations with precise timestamps you can jump to.",
  },
];

const steps = [
  {
    step: "01",
    icon: Link2,
    title: "Paste a Video URL",
    description:
      "Drop in any YouTube link. VidMind handles the rest — no uploads or setup required.",
  },
  {
    step: "02",
    icon: Brain,
    title: "AI Analysis",
    description:
      "Our AI extracts summaries, key concepts, takeaways, and generates thought-provoking questions.",
  },
  {
    step: "03",
    icon: MessageSquare,
    title: "Chat and Explore",
    description:
      "Dive deeper with natural conversation. Get source-grounded answers with timestamp references.",
  },
];

export default function Home() {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();

    const url = videoUrl.trim();
    if (!url) {
      setError("Please enter a YouTube URL.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await analyzeVideo(url);
      sessionStorage.setItem("vidmind-analysis", JSON.stringify(response));
      router.push("/analyze");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedFile) {
      setError("Please select a video file.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await uploadVideo(selectedFile);
      sessionStorage.setItem("vidmind-analysis", JSON.stringify(response));
      router.push("/analyze");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (error) setError(null);
  }

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] translate-x-1/4 translate-y-1/4 rounded-full bg-blue-600/8 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600/20 ring-1 ring-violet-500/30">
            <Video className="size-4 text-violet-400" />
          </div>
          <span className="text-sm font-semibold tracking-tight">VidMind</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
            <Link href="/workspace">
              Workspace
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
            <Link href="/multi-chat">Multi Chat</Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-12 sm:px-8 sm:pt-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
              <Zap className="size-3.5" />
              AI-Powered Video Intelligence
            </div>

            <h1 className="bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl">
              VidMind
            </h1>

            <p className="mt-4 text-xl font-medium text-white/90 sm:text-2xl">
              Understand Any Video Instantly
            </p>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Transform any video into actionable intelligence. Paste a YouTube URL to instantly analyze transcripts, generate insights, and get verified citations.
            </p>

            {/* Core Value Propositions Grid */}
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 max-w-md text-left text-sm font-semibold text-foreground/80">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-violet-500 shrink-0" />
                <span>Understand videos faster</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-violet-500 shrink-0" />
                <span>Chat with any video</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-violet-500 shrink-0" />
                <span>Compare multiple videos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-violet-500 shrink-0" />
                <span>Export insights</span>
              </div>
            </div>

            <form
              onSubmit={handleAnalyze}
              className="mt-10 w-full max-w-2xl"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Play className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="Paste a YouTube URL..."
                    value={videoUrl}
                    onChange={(e) => {
                      setVideoUrl(e.target.value);
                      if (error) setError(null);
                    }}
                    className="h-12 rounded-xl border-white/10 bg-white/5 pl-11 text-base placeholder:text-muted-foreground/60 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 sm:h-14 sm:text-base"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="h-12 gap-2 rounded-xl bg-violet-600 px-6 text-base font-medium hover:bg-violet-500 sm:h-14 sm:px-8"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Analyze Video
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <p className="mt-3 text-left text-sm text-red-400">{error}</p>
              )}
            </form>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs font-medium text-muted-foreground">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form
              onSubmit={handleUpload}
              className="mt-6 w-full max-w-2xl"
            >
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Choose Video File
                  </label>
                  <Input
                    type="file"
                    accept=".mp4,.mov,.avi,.mkv,.webm"
                    onChange={handleFileChange}
                    className="h-12 rounded-xl border-white/10 bg-white/5 text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-600/20 file:text-violet-300 file:text-sm file:font-medium hover:file:bg-violet-600/30 sm:h-14 sm:text-base"
                  />
                </div>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading || !selectedFile}
                  className="h-12 gap-2 rounded-xl bg-violet-600 px-6 text-base font-medium hover:bg-violet-500 sm:h-14 sm:px-8"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      Upload & Analyze
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            <p className="mt-4 text-xs text-muted-foreground/75">
              No signup required. Analyze and chat with videos instantly.
            </p>

            {/* Clickable Hover Trust Cards */}
            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 w-full max-w-2xl border-t border-white/5 pt-8">
              {[
                {
                  title: "Source Grounded Answers",
                  desc: "→ Every answer includes transcript citations.",
                },
                {
                  title: "Timestamp Citations",
                  desc: "→ Jump directly to the exact moment in the video.",
                },
                {
                  title: "Multi Video Comparison",
                  desc: "→ Compare ideas across multiple videos.",
                },
                {
                  title: "AI Video Chat",
                  desc: "→ Ask questions about any analyzed video.",
                },
              ].map((badge) => (
                <div
                  key={badge.title}
                  className="group relative rounded-xl border border-white/5 bg-white/[0.015] p-3 text-left transition-all duration-300 hover:border-violet-500/20 hover:bg-violet-500/[0.02] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-foreground/90 group-hover:text-violet-300 transition-colors">
                      {badge.title}
                    </span>
                  </div>
                  <p className="mt-1 pl-5 text-[10px] leading-relaxed text-muted-foreground/0 group-hover:text-muted-foreground/80 transition-all duration-300 max-h-0 group-hover:max-h-8 overflow-hidden">
                    {badge.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to understand video
            </h2>
            <p className="mt-3 text-muted-foreground">
              Powerful AI capabilities built for researchers, learners, and
              teams.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group border-white/8 bg-white/[0.03] transition-colors hover:border-violet-500/20 hover:bg-white/[0.05]"
              >
                <CardHeader className="px-6 pt-6 pb-4">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-violet-600/15 ring-1 ring-violet-500/20 transition-colors group-hover:bg-violet-600/25">
                    <feature.icon className="size-5 text-violet-400" />
                  </div>
                  <CardTitle className="text-base font-semibold">{feature.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-3 text-muted-foreground">
              From URL to insights in three simple steps.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((item, index) => (
              <Card
                key={item.title}
                className="relative border-white/8 bg-white/[0.03] transition-colors hover:border-violet-500/20 hover:bg-white/[0.05]"
              >
                {index < steps.length - 1 && (
                  <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-gradient-to-r from-violet-500/40 to-transparent md:block" />
                )}
                <CardContent className="px-6 py-6">
                  <span className="text-xs font-mono font-medium text-violet-400">
                    Step {item.step}
                  </span>
                  <div className="mt-4 flex size-11 items-center justify-center rounded-xl bg-violet-600/15 ring-1 ring-violet-500/20">
                    <item.icon className="size-5 text-violet-400" />
                  </div>
                  <CardTitle className="mt-5 text-base font-semibold">{item.title}</CardTitle>
                  <CardDescription className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-violet-600/20 ring-1 ring-violet-500/30">
              <Video className="size-3.5 text-violet-400" />
            </div>
            <span className="text-sm font-semibold">VidMind</span>
          </div>
          <p className="text-sm text-muted-foreground">Built with AI</p>
        </div>
      </footer>
    </div>
  );
}
