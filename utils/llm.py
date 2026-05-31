from langchain_ollama import ChatOllama
from langchain_groq import ChatGroq
import os
from langchain_google_genai import ChatGoogleGenerativeAI
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

def get_llm_gemini():

    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv(
            "GEMINI_API_KEY"
        ),
        temperature=0
    )