import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import (
    StrOutputParser
)
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter
)

from utils.llm import (
    get_llm_groq,
    get_llm_gemini
)

llm = get_llm_groq()


def split_transcript(transcript: str):

    splitter = RecursiveCharacterTextSplitter(

        chunk_size=6000,
        chunk_overlap=200

    )

    return splitter.split_text(transcript)


def generate_summary(transcript: str):

    chunks = split_transcript(transcript)

    if len(chunks) == 1:

        chain = (

            ChatPromptTemplate.from_messages([

                (

                    "system",

                    """
You are an expert video summarizer.

Create a concise but informative summary.

Requirements:

- Main ideas
- Important explanations
- Key conclusions
- Maximum 500 words
"""

                ),

                ("human", "{text}")

            ])

            | llm

            | StrOutputParser()

        )

        return chain.invoke({

            "text": transcript

        })

    map_chain = (

        ChatPromptTemplate.from_messages([

            (

                "system",

                """
Summarize this transcript section.

Focus only on important information.
Ignore filler content.
"""

            ),

            ("human", "{text}")

        ])

        | llm

        | StrOutputParser()

    )

    chunk_summaries = [

        map_chain.invoke({

            "text": chunk

        })

        for chunk in chunks

    ]

    combined = "\n\n".join(

        chunk_summaries

    )

    reduce_chain = (

        ChatPromptTemplate.from_messages([

            (

                "system",

                """
Combine these partial summaries into one final summary.

Requirements:

- Preserve key ideas
- Remove repetition
- Natural flow
- Maximum 500 words
"""

            ),

            ("human", "{text}")

        ])

        | llm

        | StrOutputParser()

    )

    return reduce_chain.invoke({

        "text": combined

    })


def generate_analysis(summary: str):

    prompt = f"""
You are VidMind AI, an expert video analyst.

Analyze the provided video summary.

Return ONLY valid JSON.

Rules:

- Return ONLY JSON
- No markdown
- No explanations outside JSON
- Generate exactly 5 takeaways
- Generate exactly 5 interesting questions
- Generate exactly 5 suggested questions
- Suggested questions should be questions a user may ask the chatbot next

Return EXACTLY this format:

{{
  "title": "...",

  "key_takeaways": [
    "...",
    "...",
    "...",
    "...",
    "..."
  ],

  "important_concepts": [
    {{
      "concept": "...",
      "explanation": "..."
    }},
    {{
      "concept": "...",
      "explanation": "..."
    }},
    {{
      "concept": "...",
      "explanation": "..."
    }},
    {{
      "concept": "...",
      "explanation": "..."
    }},
    {{
      "concept": "...",
      "explanation": "..."
    }}
  ],

  "interesting_questions": [
    "...",
    "...",
    "...",
    "...",
    "..."
  ],

  "suggested_questions": [
    "...",
    "...",
    "...",
    "...",
    "..."
  ]
}}

Video Summary:

{summary}
"""

    response = llm.invoke(prompt)

    content = response.content.strip()

    content = (
        content
        .replace("```json", "")
        .replace("```", "")
        .strip()
    )

    start = content.find("{")
    end = content.rfind("}") + 1

    if start != -1 and end != -1:
        content = content[start:end]

    try:

        return json.loads(content)

    except Exception as e:

        print("\n===== ANALYSIS ERROR =====")
        print(e)
        print(content)

        return {
            "title": "Untitled Video",
            "key_takeaways": [],
            "important_concepts": [],
            "interesting_questions": [],
            "suggested_questions": []
        }


def analyze_video(transcript: str):

    summary = generate_summary(

        transcript

    )

    analysis = generate_analysis(

        summary

    )

    return {

        "title":
            analysis["title"],

        "summary":
            summary,

        "key_takeaways":
            analysis["key_takeaways"],

        "important_concepts":
            analysis["important_concepts"],

        "interesting_questions":
            analysis["interesting_questions"],

        "suggested_questions":
            analysis["suggested_questions"]

    }