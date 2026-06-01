"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Download,
  FileText,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Loader2,
  MessageCircleQuestion,
  Sparkles,
  Video,
  VideoOff,
} from "lucide-react";

import {
  downloadSummaryPdf,
  downloadTranscript,
  ApiError,
} from "@/services/api";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalyzeVideoResponse } from "@/types/video";

const ANALYSIS_SESSION_KEY = "vidmind-analysis";

function parseAnalysis(raw: string): AnalyzeVideoResponse | null {
  try {
    const data = JSON.parse(raw) as AnalyzeVideoResponse;

    if (
      typeof data.video_id !== "string" ||
      typeof data.title !== "string" ||
      typeof data.summary !== "string" ||
      !Array.isArray(data.key_takeaways) ||
      !Array.isArray(data.important_concepts) ||
      !Array.isArray(data.interesting_questions) ||
      !Array.isArray(data.suggested_questions)
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[350px] w-[500px] translate-x-1/4 translate-y-1/4 rounded-full bg-blue-600/8 blur-[100px]" />
      </div>

      <header className="mx-auto flex max-w-5xl items-center gap-2.5 px-6 py-6 sm:px-8">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600/20 ring-1 ring-violet-500/30">
          <Video className="size-4 text-violet-400" />
        </div>
        <span className="text-sm font-semibold tracking-tight">VidMind</span>
      </header>

      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <PageShell>
      <main className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-16 text-center sm:px-8">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-600/15 ring-1 ring-violet-500/20">
          <VideoOff className="size-8 text-violet-400" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          No analysis found
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Analyze a video from the homepage first, then you&apos;ll see your
          summary, takeaways, and questions here.
        </p>
        <Button
          asChild
          className="mt-8 gap-2 rounded-xl bg-violet-600 px-6 hover:bg-violet-500"
        >
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </Button>
      </main>
    </PageShell>
  );
}

function AnalysisContent({ data }: { data: AnalyzeVideoResponse }) {
  const [downloading, setDownloading] = useState<"pdf" | "transcript" | null>(
    null
  );
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleDownloadSummaryPdf() {
    setExportError(null);
    setDownloading("pdf");

    try {
      await downloadSummaryPdf(data.video_id);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to download the summary PDF. Please try again.";
      setExportError(message);
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadTranscript() {
    setExportError(null);
    setDownloading("transcript");

    try {
      await downloadTranscript(data.video_id);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to download the transcript. Please try again.";
      setExportError(message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <PageShell>
      <main className="mx-auto max-w-5xl px-6 pb-20 sm:px-8">
        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <Sparkles className="size-3.5" />
            Analysis Complete
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {data.title}
          </h1>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={downloading !== null}
              onClick={handleDownloadSummaryPdf}
              className="gap-2 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            >
              {downloading === "pdf" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download Summary PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={downloading !== null}
              onClick={handleDownloadTranscript}
              className="gap-2 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            >
              {downloading === "transcript" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              Download Transcript
            </Button>
          </div>

          {exportError && (
            <p className="mt-3 text-sm text-red-400">{exportError}</p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="border-white/8 bg-white/[0.03] py-6 ring-white/10">
            <CardHeader className="px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-violet-600/15 ring-1 ring-violet-500/20">
                  <BookOpen className="size-4 text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Summary</CardTitle>
                  <CardDescription>
                    AI-generated overview of the video content
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6">
              <p className="text-base leading-relaxed text-muted-foreground">
                {data.summary}
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-white/[0.03] py-6 ring-white/10">
            <CardHeader className="px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-violet-600/15 ring-1 ring-violet-500/20">
                  <ListChecks className="size-4 text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Key Takeaways</CardTitle>
                  <CardDescription>
                    The most important points to remember
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6">
              <ul className="space-y-3">
                {data.key_takeaways.map((takeaway, index) => (
                  <li
                    key={`${index}-${takeaway}`}
                    className="flex gap-3 text-sm leading-relaxed sm:text-base"
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-violet-600/15 text-xs font-medium text-violet-400">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-white/[0.03] py-6 ring-white/10">
            <CardHeader className="px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-violet-600/15 ring-1 ring-violet-500/20">
                  <Lightbulb className="size-4 text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Important Concepts</CardTitle>
                  <CardDescription>
                    Core ideas explained in detail
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {data.important_concepts.map((item, index) => (
                  <div
                    key={`${index}-${item.concept}`}
                    className="rounded-lg border border-white/8 bg-white/[0.02] p-4"
                  >
                    <h3 className="font-medium text-foreground">
                      {item.concept}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-white/8 bg-white/[0.03] py-6 ring-white/10">
              <CardHeader className="px-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-violet-600/15 ring-1 ring-violet-500/20">
                    <HelpCircle className="size-4 text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Interesting Questions
                    </CardTitle>
                    <CardDescription>
                      Thought-provoking questions raised by the content
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6">
                <ul className="space-y-3">
                  {data.interesting_questions.map((question, index) => (
                    <li
                      key={`${index}-${question}`}
                      className="flex gap-3 text-sm leading-relaxed sm:text-base"
                    >
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-400" />
                      <span className="text-muted-foreground">{question}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-white/[0.03] py-6 ring-white/10">
              <CardHeader className="px-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-violet-600/15 ring-1 ring-violet-500/20">
                    <MessageCircleQuestion className="size-4 text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Suggested Questions
                    </CardTitle>
                    <CardDescription>
                      Questions you might want to explore next
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6">
                <ul className="space-y-3">
                  {data.suggested_questions.map((question, index) => (
                    <li
                      key={`${index}-${question}`}
                      className="rounded-lg border border-violet-500/15 bg-violet-500/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground sm:text-base"
                    >
                      {question}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </PageShell>
  );
}

export default function AnalyzePage() {
  const [data, setData] = useState<AnalyzeVideoResponse | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(ANALYSIS_SESSION_KEY);
    setData(raw ? parseAnalysis(raw) : null);
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  if (!data) {
    return <EmptyState />;
  }

  return <AnalysisContent data={data} />;
}
