export interface SourceReference {
  video_title: string;
  timestamp: string;
  preview: string;
  start_seconds: number;
  end_seconds: number;
  video_url: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
}

export interface ChatRequest {
  video_id: string;
  question: string;
  history?: string;
}

export interface ChatResponse {
  answer: string;
  sources: SourceReference[];
}

export interface MultiChatRequest {
  video_ids: string[];
  question: string;
  history?: string;
}

export interface WorkspaceVideo {
  video_id: string;
  title: string;
}

export interface WorkspaceResponse {
  videos: WorkspaceVideo[];
}
