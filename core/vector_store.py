
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
import re


CHROMA_DIR = "vector_db"

EMBEDDING_MODEL = (
    "sentence-transformers/all-MiniLM-L6-v2"
)

def get_embeddings():

    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={
            "device": "cpu"
        }
    )


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
    sponsor_hits = 0

    for phrase in banned_phrases:
        if phrase in text:
            sponsor_hits += 1

    if sponsor_hits >= 3:
        return True

    if len(text.split()) < 12:
        return True

    return False


def build_vector_store(transcript_segments,video_title,source_url):

    print("Building vector store")

    docs = []

    GROUP_SIZE = 8

    grouped_segments = []

    current_group = []

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
                        "end_seconds": end_time,
                        "video_url": source_url,
     
                    }

                )

    )

    embeddings = get_embeddings()

    collection_name = re.sub(
        r"[^a-zA-Z0-9_-]",
        "",
        video_title.replace(" ", "_").lower()
    )

    if not docs:
        raise ValueError(
            "No valid transcript chunks found"
    )

    vector_store = Chroma.from_documents(

        documents=docs,

        embedding=embeddings,

        collection_name=collection_name,

        persist_directory=CHROMA_DIR
    )

    return vector_store



def get_retriever(vector_store):

    return vector_store.as_retriever(

        search_type="mmr",

        search_kwargs={

            "k": 8,

            "fetch_k": 20,

            "lambda_mult": 0.85,
        }
    )

