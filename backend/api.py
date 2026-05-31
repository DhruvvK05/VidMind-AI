# backend/api.py
from fastapi import FastAPI
from pydantic import BaseModel
import uuid
from main import run_pipeline
from core.rag_chain import (
    ask_question,
    answer_multi
)
from fastapi.responses import PlainTextResponse
from fastapi.responses import FileResponse
from utils.pdf_export import create_summary_pdf
from utils.pdf_export import create_chat_pdf

app = FastAPI() 

workspace = {}
multi_chat_history = {}

@app.get("/")
def root():
    return {
        "status": "VidMind Backend Running"
    }

class AnalyzeRequest(BaseModel):
    source: str
    language: str = "english"

class ChatRequest(BaseModel):

    video_id: str

    question: str

    history: str = ""

class MultiChatRequest(BaseModel):

    video_ids: list[str]

    question: str

    history: str = ""

@app.post("/analyze")
def analyze_video(data: AnalyzeRequest):

    result = run_pipeline(
        data.source,
        data.language
    )

    result["source_url"] = data.source

    video_id = str(uuid.uuid4())

    result["chat_history"] = []
    workspace[video_id] = result
   
    for vid, video in workspace.items():
        print(vid, "->", video["title"])

    return {

        "video_id": video_id,

        "title": result["title"],

        "summary": result["summary"],

        "transcript": result["transcript"],

        "key_takeaways":
            result["key_takeaways"],

        "important_concepts":
            result["important_concepts"],

        "interesting_questions":
            result["interesting_questions"],
        
        "suggested_questions":
            result.get(
                "suggested_questions",
                []
        )

    }

@app.get("/workspace")
def get_workspace():

    videos = []

    for video_id, video in workspace.items():

        videos.append({

            "video_id": video_id,

            "title": video["title"]

        })

    return {
        "videos": videos
    }

@app.post("/chat")
def chat_with_video(data: ChatRequest):

    if data.video_id not in workspace:

        return {
            "error":
            "Video not found in workspace"
        }

    video = workspace[
        data.video_id
    ]

    response = ask_question(

        rag_chain=video["rag_chain"],

        retriever=video["retriever"],

        question=data.question,

        history=data.history

    )
    video["chat_history"].append({

        "role": "user",

        "content": data.question

    })

    video["chat_history"].append({

        "role": "assistant",

        "content": response["answer"],

        "sources": response.get(
            "sources",
            []
        )

    })

    return response


@app.post("/multi-chat")
def multi_chat(data: MultiChatRequest):

    valid_videos = []

    for video_id in data.video_ids:

        if video_id in workspace:

            valid_videos.append(
                video_id
            )

    if not valid_videos:

        return {
            "error":
            "No valid videos found"
        }
    
    chat_id = "_".join(
        sorted(valid_videos)
    )

    if chat_id not in multi_chat_history:

        multi_chat_history[
            chat_id
        ] = []

    response = answer_multi(

        workspace=workspace,

        selected_videos=valid_videos,

        question=data.question,

        history=data.history

    )
    multi_chat_history[
        chat_id
    ].append({

        "role": "user",

        "content": data.question

    })

    multi_chat_history[
        chat_id
    ].append({

            "role": "assistant",

            "content":
                response["answer"],

            "sources":
                response.get(
                    "sources",
                    []
                )

    })
    response["chat_id"] = chat_id

    return response

@app.get("/video/{video_id}")
def get_video(video_id: str):

    if video_id not in workspace:
        return {"error": "Video not found"}

    video = workspace[video_id]

    return {

        "video_id": video_id,

        "title": video["title"],

        "summary": video["summary"],

        "key_takeaways": video["key_takeaways"],

        "important_concepts": video["important_concepts"],

        "interesting_questions":
            video["interesting_questions"],

        "transcript": video["transcript"],
        
        "suggested_questions":
            video.get(
                "suggested_questions",
                []
            )
    }

@app.get(
    "/chat-history/{video_id}"
)
def get_chat_history(
    video_id: str
):

    if video_id not in workspace:

        return {
            "error":
            "Video not found"
        }

    return {

        "messages":

        workspace[video_id].get(

            "chat_history",

            []

        )

    }


@app.get(
    "/multi-chat-history/{chat_id}"
)
def get_multi_chat_history(
    chat_id: str
):

    return {

        "messages":

        multi_chat_history.get(

            chat_id,

            []

        )

    }

@app.delete("/video/{video_id}")
def delete_video(video_id: str):

    if video_id not in workspace:

        return {
            "error":
            "Video not found"
        }

    del workspace[video_id]

    return {
    "success": True,
    "message": "Video deleted successfully"
}


@app.get("/video/{video_id}/pdf")
def download_pdf(video_id: str):

    if video_id not in workspace:
        return {"error": "Video not found"}

    video = workspace[video_id]

    pdf_path = f"{video_id}.pdf"

    create_summary_pdf(
        video,
        pdf_path
    )

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{video['title']}.pdf"
    )


@app.get("/chat-history/{video_id}/pdf")
def export_chat(video_id: str):

    if video_id not in workspace:
        return {"error": "Video not found"}

    chat_history = workspace[
        video_id
    ].get(
        "chat_history",
        []
    )

    pdf_path = f"{video_id}_chat.pdf"

    create_chat_pdf(
        chat_history,
        pdf_path
    )

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename="chat_history.pdf"
    )


@app.get(
    "/video/{video_id}/transcript"
)
def get_transcript(
    video_id: str
):

    if video_id not in workspace:

        return {
            "error":
            "Video not found"
        }

    return PlainTextResponse(

        workspace[
            video_id
        ]["transcript"]

    )

@app.get("/video/{video_id}/transcript/download")
def download_transcript(video_id: str):

    if video_id not in workspace:
        return {"error": "Video not found"}

    transcript = workspace[video_id]["transcript"]

    file_name = f"{video_id}_transcript.txt"

    with open(file_name, "w", encoding="utf-8") as f:
        f.write(transcript)

    return FileResponse(
        file_name,
        media_type="text/plain",
        filename="transcript.txt"
    )