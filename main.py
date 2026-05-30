from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from langchain_mistralai import ChatMistralAI

from utils.audio_processor import process_input
from utils.text_cleaner import clean_transcript
from core.transcriber import (
    transcribe_all,
    transcript_to_text
)

from core.summarizer import (
    summarize,
    generate_title
)

from core.extractor import (
    extract_key_takeaways,
    extract_important_concepts,
    extract_interesting_questions
)

from core.rag_chain import (
    build_rag_chain,
    ask_question
)

from core.suggested_questions import (
    generate_suggested_questions
)

load_dotenv()


def get_llm_mistral():
    return ChatMistralAI(model = "mistral-small-latest", mistral_api_key = os.getenv("MISTRAL_API_KEY"),temperature=0.2)

def get_llm_ollama():
    return ChatOllama(model="llama3",temperature=0.2,num_ctx=8192)

# =====================================================
# PIPELINE
# =====================================================

def run_pipeline(
    source: str,
    language: str = "english"
) -> dict:

    print("Starting VidMind AI")

    # ==========================================
    # AUDIO
    # ==========================================

    chunks = process_input(source)

    # ==========================================
    # TRANSCRIPTION
    # ==========================================

    transcript_segments = transcribe_all(
        chunks,
        language
    )

    transcript_text = transcript_to_text(
        transcript_segments
    )

    # transcript_text = clean_transcript(
    #     transcript_text
    # )
    # ==========================================
    # SUMMARY
    # ==========================================

    title = generate_title(
        transcript_text
    )

    title = title.strip().replace('"', "")

    summary = summarize(
        transcript_text
    )

    # ==========================================
    # INSIGHTS
    # ==========================================

    key_takeaways = extract_key_takeaways(
        transcript_text
    )

    important_concepts = (
        extract_important_concepts(
            transcript_text
        )
    )

    interesting_questions = (
        extract_interesting_questions(
            transcript_text
        )
    )
    suggested_questions = generate_suggested_questions(
        get_llm_ollama(),
        summary
    )

    # ==========================================
    # RAG
    # ==========================================

    rag_chain, retriever = build_rag_chain(
        transcript_segments,
        title
    )

    # ==========================================
    # RETURN
    # ==========================================

    return {

        "title": title,

        "transcript": transcript_text,

        "summary": summary,

        "key_takeaways": key_takeaways,

        "important_concepts": important_concepts,

        "interesting_questions":
            interesting_questions,

        "suggested_questions":
            suggested_questions,

        "rag_chain": rag_chain,

        "retriever": retriever,

    }


# =====================================================
# CLI MODE
# =====================================================

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

    print("\n" + "=" * 60)

    print(
        f"\n📌 Title:\n{result['title']}"
    )

    print(
        f"\n📋 Summary:\n{result['summary']}"
    )

    print(
        f"\n🧠 Key Takeaways:\n{result['key_takeaways']}"
    )

    print(
        f"\n📚 Important Concepts:\n{result['important_concepts']}"
    )

    print(
        f"\n❓ Interesting Questions:\n{result['interesting_questions']}"
    )

    print("\n" + "=" * 60)

    print(
        "\n💬 Chat with the video "
        "(type 'exit' to quit)\n"
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

        print(
            f"\n🤖 Assistant:\n{answer}\n"
        )