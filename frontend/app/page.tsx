"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
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

import { analyzeVideo, ApiError } from "@/services/api";
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
          <Button variant="outline" size="sm" className="hidden sm:inline-flex">
            Sign in
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

            <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl">
              VidMind
            </h1>

            <p className="mt-4 text-xl font-medium text-white/90 sm:text-2xl">
              Understand Any Video Instantly
            </p>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Transform any video into actionable intelligence. Generate AI
              summaries, extract key concepts, ask questions, and chat with
              your content — all with source-grounded answers and timestamps.
            </p>

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

            <p className="mt-4 text-xs text-muted-foreground/70">
              No account required · Supports YouTube · Results in seconds
            </p>
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
