#Actionableitems , decision , questions 
from langchain_ollama import ChatOllama
import os
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
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
    return ChatOllama(model="llama3",temperature=0.2,num_ctx=8192)


llm = get_llm_groq()

def build_chain(system_prompt : str):
    
    return (
        RunnablePassthrough() | RunnableLambda(lambda x : {"text" : x}) |ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human","{text}"),
    ]) | llm |StrOutputParser()
    )

def extract_key_takeaways(
    transcript
):

            prompt = f"""

        Extract the 5 most important takeaways
        from this video.

        Return as bullet points.

        Transcript:

        {transcript}

        """

            return llm.invoke(
                prompt
            ).content


def extract_important_concepts(
    transcript
):

            prompt = f"""

        Identify the most important concepts
        explained in this video.

        Explain each briefly.

        Transcript:

        {transcript}

        """

            return llm.invoke(
                prompt
            ).content
            

def extract_interesting_questions(
    transcript
):

            prompt = f"""

        Generate 5 interesting questions
        that naturally arise from this video.

        These should encourage deeper thinking.

        Transcript:

        {transcript}

        """

            return llm.invoke(
                prompt
            ).content