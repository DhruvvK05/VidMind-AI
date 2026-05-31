from langchain_ollama import ChatOllama
from langchain_groq import ChatGroq
import os

from dotenv import load_dotenv

load_dotenv()

def get_llm_groq():

    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.2
    )


def get_llm_ollama():

    return ChatOllama(
        model="llama3",
        temperature=0.2,
        num_ctx=8192
    )