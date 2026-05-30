
import os
from langchain_ollama import ChatOllama
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda

from core.vector_store import (
    build_vector_store,
    get_retriever,
)
from dotenv import load_dotenv
from core.reranker import rerank_documents
load_dotenv()

# =====================================================
# LLM
# =====================================================

def get_llm_groq():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.2
    )

def get_llm_ollama():

    return ChatOllama(
        model="llama3",
        temperature=0.1,
        num_ctx=8192
    )


# =====================================================
# FORMAT DOCUMENTS
# =====================================================

def format_docs(docs):

    formatted = []

    for doc in docs:

        timestamp = doc.metadata.get(
            "timestamp",
            "00:00"
        )

        formatted.append(
            f"""
Timestamp: [{timestamp}]
Content: {doc.page_content}
"""
        )

    return "\n\n".join(formatted)


# =====================================================
# BUILD RAG CHAIN
# =====================================================

def build_rag_chain(transcript,video_title):

    vector_store = build_vector_store(transcript,video_title)

    retriever = get_retriever(vector_store)

    llm = get_llm_groq()

    prompt = ChatPromptTemplate.from_template("""
You are VidMind AI, an intelligent video understanding assistant.

Answer the user's question using ONLY the transcript context provided.


RULES:

- Stay grounded in the transcript.
- Answer in a detailed and informative manner.
- Prefer 1-3 well-developed paragraphs instead of very short answers.
- Explain concepts using the information available in the transcript.
- Include important context, implications, and supporting details mentioned in the video.
- If multiple relevant transcript sections exist, combine them into a coherent answer.
- Mention timestamps naturally when useful.
- Do NOT invent information that is not present in the transcript.
- Keep the answer focused on what the video discusses.
- If the topic is only partially discussed, clearly state that.
- If the topic is NOT discussed in the transcript, say:
"This topic is not discussed in the video transcript."



Conversation History:
{history}

Transcript Context:
{context}

Question:
{question}

Answer:
""")

    rag_chain = (
        {
            "context": RunnableLambda(
                lambda x: x["context"]
            ),

            "question": RunnableLambda(
                lambda x: x["question"]
            ),

            "history": RunnableLambda(
                lambda x: x["history"]
            ),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain, retriever


# =====================================================
# ASK QUESTION
# =====================================================
def retrieve_from_videos(
    workspace,
    selected_videos,
    question
):

    all_docs = []

    for video in selected_videos:

        retriever = workspace[video]["retriever"]

        docs = retriever.invoke(question)

        all_docs.extend(docs)

    return all_docs

def stream_answer_multi(
    workspace,
    selected_videos,
    question,
    history
):

    docs = retrieve_from_videos(

        workspace,
        selected_videos,
        question

    )
    print("\n===== BEFORE RERANK =====")

    for doc in docs:

        print(
            doc.metadata.get(
                "video_title",
                "Unknown"
            )
        )

    docs = rerank_documents(

        question,
        docs,
        top_k=3

)
    print("\n===== AFTER RERANK =====")

    for doc in docs:

        print(
            doc.metadata.get(
                "video_title",
                "Unknown"
            )
        )

    context = format_docs(docs)

    sources = []

    seen_sources = set()

    for doc in docs:

        video_title = doc.metadata.get(
            "video_title",
            "Unknown Video"
        )

        timestamp = doc.metadata.get(
            "timestamp",
            "00:00"
        )

        source_key = (
            video_title,
            timestamp
        )

        if source_key in seen_sources:
            continue

        seen_sources.add(source_key)

        sources.append({

            "video_title": doc.metadata.get(
                "video_title",
                "Unknown Video"
            ),

            "timestamp": timestamp,

            "preview": doc.page_content[:250],

            "start_seconds": doc.metadata.get(
                "start_seconds",
                0
            ),

            "end_seconds": doc.metadata.get(
                "end_seconds",
                0
            )

})
        
    first_video = workspace[
                selected_videos[0]
            ]

    rag_chain = first_video[
            "rag_chain"
        ]

    stream = rag_chain.stream({

        "question": question,
        "history": history,
        "context": context,

    })
    full_answer = rag_chain.invoke({

    "question": question,
    "history": history,
    "context": context,

})

    lowered = full_answer.lower()

    irrelevant_phrases = [

        "not discussed in the video transcript",
        "not mentioned in the transcript",
        "cannot find information",
        "not discussed in the video",

    ]

    if any(
        phrase in lowered
        for phrase in irrelevant_phrases
    ):

        sources = []

    return stream, sources

def answer_multi(
    workspace,
    selected_videos,
    question,
    history
):

    docs = retrieve_from_videos(

        workspace,
        selected_videos,
        question

    )

    docs = rerank_documents(

        question,
        docs,
        top_k=3

    )

    context = format_docs(docs)

    sources = []

    seen_sources = set()

    for doc in docs:

        video_title = doc.metadata.get(
            "video_title",
            "Unknown Video"
        )

        timestamp = doc.metadata.get(
            "timestamp",
            "00:00"
        )

        source_key = (
            video_title,
            timestamp
        )

        if source_key in seen_sources:
            continue

        seen_sources.add(source_key)

        sources.append({

            "video_title": video_title,

            "timestamp": timestamp,

            "preview": doc.page_content[:250],

            "start_seconds": doc.metadata.get(
                "start_seconds",
                0
            ),

            "end_seconds": doc.metadata.get(
                "end_seconds",
                0
            )

        })

    first_video = workspace[
        selected_videos[0]
    ]

    rag_chain = first_video[
        "rag_chain"
    ]

    answer = rag_chain.invoke({

        "question": question,

        "history": history,

        "context": context

    })

    lowered = answer.lower()

    irrelevant_phrases = [

        "not discussed in the video transcript",
        "not mentioned in the transcript",
        "cannot find information",
        "not discussed in the video",

    ]

    if any(
        phrase in lowered
        for phrase in irrelevant_phrases
    ):

        sources = []

    return {

        "answer": answer,

        "sources": sources

    }

def ask_question(
    rag_chain,
    retriever,
    question: str,
    history: str
):

    print(f"\nQuestion: {question}")

    # ==========================================
    # RETRIEVE DOCUMENTS
    # ==========================================

    docs = retriever.invoke(question)

    # ==========================================
    # RERANK DOCUMENTS
    # ==========================================

    docs = rerank_documents(
        question,
        docs,
        top_k=5
    )

    # ==========================================
    # FORMAT CONTEXT
    # ==========================================

    context = format_docs(docs)

    # ==========================================
    # GENERATE ANSWER
    # ==========================================

    answer = rag_chain.invoke({
        "question": question,
        "history": history,
        "context": context,
    })

    print(f"\nAnswer: {answer}")

    # ==========================================
    # BUILD SOURCES
    # ==========================================

    sources = []

    seen_sources = set()

    for doc in docs:

        video_title = doc.metadata.get(
            "video_title",
            "Unknown Video"
        )

        timestamp = doc.metadata.get(
            "timestamp",
            "00:00"
        )

        source_key = (
            video_title,
            timestamp
        )

        if source_key in seen_sources:
            continue

        seen_sources.add(source_key)

        preview = doc.page_content[:250]

        sources.append({

            "timestamp": timestamp,
            "preview": preview,

            "start_seconds": doc.metadata.get(
                "start_seconds",
                0
            ),

            "end_seconds": doc.metadata.get(
                "end_seconds",
                0
            ),

        })

    # ==========================================
    # DETECT IRRELEVANT ANSWERS
    # ==========================================

    lowered = answer.lower()

    irrelevant_phrases = [

        "not discussed in the video transcript",
        "not mentioned in the transcript",
        "cannot find information",
        "not discussed in the video",

    ]

    if any(
        phrase in lowered
        for phrase in irrelevant_phrases
    ):

        sources = []

    # ==========================================
    # RETURN
    # ==========================================

    return {
        "answer": answer,
        "sources": sources,
    }

def stream_answer(
    rag_chain,
    retriever,
    question: str,
    history: str
):

    docs = retriever.invoke(question)

    docs = rerank_documents(
        question,
        docs,
        top_k=3
    )

    context = format_docs(docs)

    sources = []

    seen_source = set()

    for doc in docs:

        video_title = doc.metadata.get(
            "video_title",
            "Unknown Video"
        )

        timestamp = doc.metadata.get(
            "timestamp",
            "00:00"
        )

        source_key = (
            video_title,
            timestamp
        )

        if source_key in seen_sources:
            continue

        seen_sources.add(source_key)

        sources.append({

            "timestamp": timestamp,

            "preview": doc.page_content[:250],

            "start_seconds": doc.metadata.get(
                "start_seconds",
                0
            ),

            "end_seconds": doc.metadata.get(
                "end_seconds",
                0
            )
        })

    stream = rag_chain.stream({

        "question": question,
        "history": history,
        "context": context,

    })
    full_answer = rag_chain.invoke({

        "question": question,
        "history": history,
        "context": context,

    })

    lowered = full_answer.lower()

    irrelevant_phrases = [

        "not discussed in the video transcript",
        "not mentioned in the transcript",
        "cannot find information",
        "not discussed in the video",

    ]

    if any(
        phrase in lowered
        for phrase in irrelevant_phrases
    ):

        sources = []
    return stream, sources