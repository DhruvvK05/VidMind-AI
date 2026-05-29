
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
import re

CHROMA_DIR = "vector_db"


EMBEDDING_MODEL = (
    "sentence-transformers/all-mpnet-base-v2"
)


# =====================================================
# EMBEDDINGS
# =====================================================

def get_embeddings():

    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={
            "device": "cpu"
        }
    )


# =====================================================
# FILTER LOW VALUE CHUNKS
# =====================================================

def is_low_value_chunk(text: str) -> bool:

    text = text.lower()

    banned_phrases = [

        "brilliant",
        "sponsor",
        "sponsored",
        "subscribe",
        "membership",
        "free trial",
        "use the link",
        "thanks for watching",
        "patreon",
        "like and subscribe",
        "annual membership",
        "kurzgesagt viewers",

    ]

    for phrase in banned_phrases:

        if phrase in text:
            return True

    if len(text.split()) < 12:
        return True

    return False


# =====================================================
# BUILD VECTOR STORE
# =====================================================

def build_vector_store(transcript_segments,video_title):

    print("Building vector store")

    docs = []

    GROUP_SIZE = 8

    grouped_segments = []

    current_group = []

    # ==========================================
    # GROUP SEGMENTS
    # ==========================================

    for segment in transcript_segments:

        current_group.append(segment)

        if len(current_group) >= GROUP_SIZE:

            grouped_segments.append(
                current_group
            )

            current_group = []

    if current_group:

        grouped_segments.append(
            current_group
        )

    # ==========================================
    # BUILD DOCUMENTS
    # ==========================================

    for i, group in enumerate(grouped_segments):

        start_time = int(group[0]["start"])

        end_time = int(group[-1]["end"])

        start_minutes = start_time // 60
        start_seconds = start_time % 60

        end_minutes = end_time // 60
        end_seconds = end_time % 60

        timestamp = (
            f"{start_minutes:02d}:{start_seconds:02d}"
            f" - "
            f"{end_minutes:02d}:{end_seconds:02d}"
        )

        combined_text = " ".join([

            segment["text"]

            for segment in group

        ])

        if is_low_value_chunk(combined_text):

            print(f"Skipping low-value chunk {i}")

            continue

        docs.append(

                Document(

                    page_content=combined_text,

                    metadata={

                        "timestamp": timestamp,
                        "chunk_index": i,
                        
                        "video_title":video_title,

                        "start_seconds": start_time,
                        "end_seconds": end_time
     
                    }

                )

    )

    # ==========================================
    # CREATE VECTOR STORE
    # ==========================================

    embeddings = get_embeddings()

    collection_name = re.sub(
        r"[^a-zA-Z0-9_-]",
        "",
        video_title.replace(" ", "_").lower()
    )

    vector_store = Chroma.from_documents(

        documents=docs,

        embedding=embeddings,

        collection_name=collection_name,

        persist_directory=CHROMA_DIR
    )

    return vector_store

# =====================================================
# RETRIEVER
# =====================================================

def get_retriever(vector_store):

    return vector_store.as_retriever(

        search_type="mmr",

        search_kwargs={

            "k": 8,

            "fetch_k": 20,

            "lambda_mult": 0.85,
        }
    )

