"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

interface AssistantMarkdownProps {
  content: string;
  className?: string;
}

export default function AssistantMarkdown({
  content,
  className,
}: AssistantMarkdownProps) {
  return (
    <div className={cn("ai-markdown", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}