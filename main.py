from dotenv import load_dotenv

import os

from utils.audio_processor import process_input

from core.transcriber import (
    transcribe_all,
    transcript_to_text
)

from core.video_analysis import (
    analyze_video
)

from core.rag_chain import (
    build_rag_chain,
    ask_question
)

load_dotenv()


def run_pipeline(source: str,language: str = "english") -> dict:

    chunks = process_input(source)

    transcript_segments = transcribe_all(
        chunks,
        language
    )

    transcript_text = transcript_to_text(
        transcript_segments
    )

    analysis = analyze_video(
        transcript_text
    )

    rag_chain, retriever = build_rag_chain(
        transcript_segments,
        analysis["title"],
        source
    )

    return {

        "title":
            analysis["title"],

        "transcript": transcript_text,
        
        "summary":
            analysis["summary"],

        "key_takeaways":
            analysis["key_takeaways"],

        "important_concepts":
            analysis["important_concepts"],

        "interesting_questions":
            analysis["interesting_questions"],

        "suggested_questions":
             analysis["suggested_questions"],

        "rag_chain": rag_chain,

        "retriever": retriever,

    }


if __name__ == "__main__":

    source = input(
        "Enter YouTube URL or local file path: "
    ).strip()

    language = input(
        "Language (english/hinglish): "
    ).strip() or "english"

    result = run_pipeline(
        source,
        language
    )

    rag_chain = result["rag_chain"]

    retriever = result["retriever"]

    history = ""

    while True:

        question = input("You: ").strip()

        if question.lower() in [
            "exit",
            "quit",
            "q"
        ]:
            print("👋 Goodbye!")
            break

        if not question:
            continue

        response = ask_question(

            rag_chain=rag_chain,

            retriever=retriever,

            question=question,

            history=history

        )

        answer = response["answer"]

        history += (
            f"\nUser: {question}"
            f"\nAssistant: {answer}"
        )