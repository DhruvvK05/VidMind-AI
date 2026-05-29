from dotenv import load_dotenv
from utils.audio_processor import process_input
from core.transcriber import transcribe_all
from core.summarizer import summarize, generate_title
from core.extractor import extract_key_takeaways, extract_important_concepts, extract_interesting_questions
from core.rag_chain import build_rag_chain, ask_question


load_dotenv()

def run_pipeline(source :str, language :str = "english") -> dict:
    print("starting AI Video Assistant")

    chunks = process_input(source)

    transcript = transcribe_all(chunks,language)
    print(f"raw transcription (first 300 characters ) {transcript[:300]}")

    title = generate_title(transcript)

    summary = summarize(clean_transcript)

    key_takeaways = extract_key_takeaways(clean_transcript)

    important_concepts = extract_important_concepts(clean_transcript)
    questions = extract_interesting_questions(clean_transcript)
    
    rag_chain = build_rag_chain(clean_transcript)

    return {
        "title": title,
        "transcript": transcript,
        "summary": summary,
        "key_takeaways": key_takeaways,
        "important_concepts": important_concepts,
        "interesting_questions": questions,
        "rag_chain": rag_chain,
    }

if __name__ == "__main__":
    # CLI entry point
    source = input("Enter YouTube URL or local file path: ").strip()
    language = input("Language (english/hinglish): ").strip() or "english"
    result = run_pipeline(source, language)

    # Phase 2 — Chat with your meeting via RAG
    print("\n💬 Chat with your meeting (type 'exit' to quit)\n")
    rag_chain = result["rag_chain"]
    while True:
        question = input("You: ").strip()
        if question.lower() in ["exit", "quit", "q"]:
            print("👋 Goodbye!")
            break
        if not question:
            continue
        answer = ask_question(rag_chain, question)
        print(f"\n🤖 Assistant: {answer}\n")