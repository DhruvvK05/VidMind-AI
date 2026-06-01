export interface ImportantConcept {
  concept: string;
  explanation: string;
}

export interface AnalyzeVideoRequest {
  source: string;
}

export interface AnalyzeVideoResponse {
  video_id: string;
  title: string;
  summary: string;
  transcript: string;
  key_takeaways: string[];
  important_concepts: ImportantConcept[];
  interesting_questions: string[];
  suggested_questions: string[];
}
