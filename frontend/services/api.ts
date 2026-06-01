import axios, { AxiosError, isAxiosError } from "axios";

import type { ChatRequest, ChatResponse, MultiChatRequest, WorkspaceResponse } from "@/types/chat";
import type {
  AnalyzeVideoRequest,
  AnalyzeVideoResponse,
} from "@/types/video";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new ApiError(
      "NEXT_PUBLIC_API_URL is not configured. Set it in your environment variables."
    );
  }

  return API_BASE_URL.replace(/\/$/, "");
}

function extractErrorMessage(error: AxiosError): string {
  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.detail === "string") {
      return record.detail;
    }

    if (typeof record.message === "string") {
      return record.message;
    }

    if (typeof record.error === "string") {
      return record.error;
    }
  }

  if (error.message) {
    return error.message;
  }

  return "An unexpected error occurred while communicating with the API.";
}

function handleRequestError(error: unknown): never {
  if (isAxiosError(error)) {
    if (error.response) {
      throw new ApiError(
        extractErrorMessage(error),
        error.response.status,
        error.response.data
      );
    }

    if (error.request) {
      throw new ApiError(
        "Unable to reach the VidMind backend. Check your connection and try again."
      );
    }
  }

  if (error instanceof ApiError) {
    throw error;
  }

  throw new ApiError("An unexpected error occurred while communicating with the API.");
}

function getFilenameFromDisposition(
  contentDisposition: string | undefined,
  fallback: string
): string {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (filenameMatch?.[1]) {
    return filenameMatch[1];
  }

  return fallback;
}

async function downloadFileFromResponse(
  response: { data: Blob; headers: Record<string, any> },
  fallbackFilename: string
): Promise<void> {
  const contentType = response.headers["content-type"] ?? "";

  if (contentType.includes("application/json")) {
    const text = await response.data.text();

    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) {
        throw new ApiError(parsed.error);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
    }

    throw new ApiError("Failed to download the requested file.");
  }

  const filename = getFilenameFromDisposition(
    response.headers["content-disposition"],
    fallbackFilename
  );

  const blobUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

async function downloadVideoFile(
  videoId: string,
  path: string,
  fallbackFilename: string
): Promise<void> {
  const trimmedVideoId = videoId.trim();

  if (!trimmedVideoId) {
    throw new ApiError("A video ID is required.");
  }

  try {
    const response = await apiClient.get<Blob>(
      `${getApiBaseUrl()}${path}`,
      { responseType: "blob" }
    );

    await downloadFileFromResponse(response, fallbackFilename);
  } catch (error) {
    handleRequestError(error);
  }
}

export async function downloadSummaryPdf(videoId: string): Promise<void> {
  await downloadVideoFile(
    videoId,
    `/video/${encodeURIComponent(videoId)}/pdf`,
    "summary.pdf"
  );
}

export async function downloadTranscript(videoId: string): Promise<void> {
  await downloadVideoFile(
    videoId,
    `/video/${encodeURIComponent(videoId)}/transcript/download`,
    "transcript.txt"
  );
}

const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

export async function analyzeVideo(
  source: string
): Promise<AnalyzeVideoResponse> {
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    throw new ApiError("A video source URL is required.");
  }

  try {
    const response = await apiClient.post<AnalyzeVideoResponse>(
      `${getApiBaseUrl()}/analyze`,
      { source: trimmedSource } satisfies AnalyzeVideoRequest
    );

    return response.data;
  } catch (error) {
    handleRequestError(error);
  }
}

function assertChatResponse(data: unknown): ChatResponse {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    throw new ApiError((data as { error: string }).error);
  }

  if (
    !data ||
    typeof data !== "object" ||
    typeof (data as ChatResponse).answer !== "string" ||
    !Array.isArray((data as ChatResponse).sources)
  ) {
    throw new ApiError("Received an invalid response from the chat API.");
  }

  return data as ChatResponse;
}

export async function chatWithVideo(
  payload: ChatRequest
): Promise<ChatResponse> {
  const videoId = payload.video_id.trim();
  const question = payload.question.trim();
  const history = payload.history ?? "";

  if (!videoId) {
    throw new ApiError("A video ID is required.");
  }

  if (!question) {
    throw new ApiError("A question is required.");
  }

  try {
    const response = await apiClient.post<ChatResponse>(
      `${getApiBaseUrl()}/chat`,
      {
        video_id: videoId,
        question,
        history,
      } satisfies ChatRequest
    );

    return assertChatResponse(response.data);
  } catch (error) {
    handleRequestError(error);
  }
}

export async function getWorkspace(): Promise<WorkspaceResponse> {
  try {
    const response = await apiClient.get<WorkspaceResponse>(
      `${getApiBaseUrl()}/workspace`
    );
    return response.data;
  } catch (error) {
    handleRequestError(error);
  }
}

export async function multiChatWithVideos(
  payload: MultiChatRequest
): Promise<ChatResponse & { chat_id: string }> {
  const question = payload.question.trim();
  const history = payload.history ?? "";

  if (!payload.video_ids || payload.video_ids.length < 2) {
    throw new ApiError("At least 2 videos are required for multi-chat.");
  }

  if (!question) {
    throw new ApiError("A question is required.");
  }

  try {
    const response = await apiClient.post<ChatResponse & { chat_id: string }>(
      `${getApiBaseUrl()}/multi-chat`,
      {
        video_ids: payload.video_ids,
        question,
        history,
      } satisfies MultiChatRequest
    );

    return response.data;
  } catch (error) {
    handleRequestError(error);
  }
}

