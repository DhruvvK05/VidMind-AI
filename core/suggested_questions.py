from langchain_core.prompts import ChatPromptTemplate


def generate_suggested_questions(
    llm,
    transcript
):

    prompt = ChatPromptTemplate.from_template("""

You are helping users explore a video.

Generate exactly 5 interesting questions
that can be answered from this transcript.

Requirements:

- Questions should be useful.
- Questions should be specific.
- Questions should encourage deeper exploration.
- Return ONLY the questions.
- One question per line.

Transcript:

{transcript}

""")

    chain = prompt | llm

    result = chain.invoke({

        "transcript": transcript[:12000]

    })

    questions = [

        q.strip("- ").strip()

        for q in result.content.split("\n")

        if q.strip()

    ]

    return questions[:5]