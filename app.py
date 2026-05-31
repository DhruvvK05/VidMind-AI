import os
import tempfile
import streamlit as st
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from utils.audio_processor import process_input

from core.transcriber import (
    transcribe_all,
    transcript_to_text
)



from core.suggested_questions import (
    generate_suggested_questions
)

from core.summarizer import (
    summarize,
    generate_title
)

from core.extractor import (
    extract_key_takeaways,
    extract_important_concepts,
    extract_interesting_questions,
)

from core.rag_chain import (
    build_rag_chain,
    ask_question,
    stream_answer,
    stream_answer_multi
)
from langchain_ollama import ChatOllama
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

# =====================================================
# LOAD ENV
# =====================================================

load_dotenv()

# =====================================================
# PAGE CONFIG
# =====================================================

st.set_page_config(
    page_title="VidMind AI",
    page_icon="⚡",
    layout="wide"
)

# =====================================================
# CUSTOM CSS
# =====================================================

st.markdown("""
<style>

.main {
    background-color: #0e1117;
    color: white;
}

h1 {
    color: #00ff9d;
    text-align: center;
}

.stButton button {
    width: 100%;
    background-color: #00ff9d;
    color: black;
    font-weight: bold;
    border-radius: 10px;
}

.stChatMessage {
    border-radius: 10px;
}

</style>
""", unsafe_allow_html=True)

# =====================================================
# SESSION STATE
# =====================================================

if "result" not in st.session_state:
    st.session_state.result = None

if "chat_histories" not in st.session_state:
    st.session_state.chat_histories = {}

if "video_url" not in st.session_state:
    st.session_state.video_url = None

if "workspace" not in st.session_state:
    st.session_state.workspace = {}

# =====================================================
# PIPELINE
# =====================================================

with st.sidebar:

    st.header("📁 Workspace")

    selected_videos = st.multiselect(

        "Select Videos",

        options=list(
            st.session_state.workspace.keys()
        )

    )
    st.write(
            f"Videos Loaded: {len(st.session_state.workspace)}"
    )

    if selected_videos:

        st.sidebar.write(
            "Selected:"
        )

        for vid in selected_videos:

            st.sidebar.write(
                f"• {vid}"
            )

        

def run_pipeline(source, language):

    progress = st.progress(0)

    # =================================================
    # PROCESS AUDIO
    # =================================================

    st.info("🎧 Processing Audio...")

    chunks = process_input(source)

    progress.progress(20)

    # =================================================
    # TRANSCRIBE
    # =================================================

    st.info("📡 Transcribing...")

    transcript_segments = transcribe_all(
        chunks,
        language
    )

    transcript_text = transcript_to_text(
        transcript_segments
    )
    progress.progress(40)

    # =================================================
    # SUMMARY
    # =================================================

    st.info("✨ Generating Summary...")

    title = generate_title(
        transcript_text
    )

    summary = summarize(
        transcript_text
    )

    progress.progress(60)

    # =================================================
    # EXTRACT
    # =================================================

    st.info("🔬 Extracting Insights...")

    key_takeaways = extract_key_takeaways(
        transcript_text
    )

    important_concepts = extract_important_concepts(
        transcript_text
    )

    interesting_questions = extract_interesting_questions(
        transcript_text
    )

    progress.progress(80)

    # =================================================
    # RAG
    # =================================================

    st.info("🧠 Building RAG...")

    rag_chain, retriever = build_rag_chain(
        transcript_segments,
        title,
        source
    )
    suggested_questions = generate_suggested_questions(

        get_llm_groq(),

        summary

    )
    progress.progress(100)

    return {
        "title": title,
        "transcript": transcript_text,
        "summary": summary,
        "key_takeaways": key_takeaways,
        "important_concepts": important_concepts,
        "interesting_questions": interesting_questions,
        "rag_chain": rag_chain,
        "retriever": retriever,
        "suggested_questions": suggested_questions,
    }

# =====================================================
# HEADER
# =====================================================

st.title("⚡ VidMind AI")

st.caption(
    "AI Video Summarizer + RAG Chat"
)

# =====================================================
# INPUT
# =====================================================

tab1, tab2 = st.tabs([
    "🔗 URL",
    "📁 Upload"
])

source = None

# =====================================================
# URL TAB
# =====================================================

with tab1:

    url = st.text_input(
        "Enter YouTube URL"
    )

    if url:
        source = url
        st.session_state.video_url = url

# =====================================================
# FILE TAB
# =====================================================

with tab2:

    uploaded_file = st.file_uploader(
        "Upload Video or Audio",
        type=[
            "mp4",
            "mp3",
            "wav",
            "mov",
            "mkv"
        ]
    )

    if uploaded_file:

        suffix = os.path.splitext(
            uploaded_file.name
        )[1]

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as tmp:

            tmp.write(
                uploaded_file.read()
            )

            source = tmp.name

# =====================================================
# LANGUAGE
# =====================================================

language = st.selectbox(
    "Language",
    ["english", "hinglish"]
)

# =====================================================
# ANALYZE BUTTON
# =====================================================

if st.button("⚡ Analyze"):

    if not source:

        st.warning(
            "Please upload file or enter URL"
        )

    else:

        try:

            result = run_pipeline(
                source,
                language
            )

            st.session_state.result = result

            video_name = result["title"]

            st.session_state.workspace[
                video_name
            ] = result

            st.success(
                "Analysis Completed!"
            )

            st.rerun()

        except Exception as e:

            st.error(str(e))

current_video = None

if len(selected_videos) == 1:

    current_video = st.session_state.workspace[
        selected_videos[0]
    ]


# ==========================================
# CHAT KEY
# ==========================================

if len(selected_videos) > 1:

    chat_key = "multi"

elif len(selected_videos) == 1:

    chat_key = selected_videos[0]

else:

    chat_key = "default"


if chat_key not in st.session_state.chat_histories:

    st.session_state.chat_histories[chat_key] = []

from utils.pdf_export import (
    create_chat_pdf
)

chat_pdf = "chat_export.pdf"

create_chat_pdf(

    st.session_state.chat_histories[
        chat_key
    ],

    chat_pdf
)

with open(
    chat_pdf,
    "rb"
) as file:

    st.download_button(

        "💬 Download Chat PDF",

        data=file,

        file_name="chat_export.pdf",

        mime="application/pdf"
    )

# =====================================================
# NO VIDEO SELECTED
# =====================================================

if len(selected_videos) == 0:

    st.info(
        "👈 Select a video from the sidebar or analyze a new video."
    )

# =====================================================
# MULTI VIDEO MODE
# =====================================================

elif  len(selected_videos) > 1:

    st.header(
        f"📚 Multi-Video Workspace ({len(selected_videos)} videos)"
    )

    st.write("Selected Videos:")

    for vid in selected_videos:

        st.write(f"• {vid}")

    st.info(
        "📚 Multi-Video Research Mode"
    )

    tab3 = st.container()


# =====================================================
# SINGLE VIDEO MODE
# =====================================================

elif current_video:

    result = current_video

    st.header(result["title"])

    questions = result.get(
    "suggested_questions",
    []
)

    if questions:

        st.subheader(
            "💡 Suggested Questions"
        )

        cols = st.columns(2)

        for i, question in enumerate(
            questions
        ):

            with cols[i % 2]:

                if st.button(
                    question,
                    key=f"suggested_{i}"
                ):

                    st.session_state[
                        "prefill_question"
                    ] = question

    tab1, tab2, tab3 = st.tabs([

        "📋 Summary",
        "📄 Transcript",
        "💬 Chat"

    ])
    # =================================================
    # SUMMARY TAB
    # =================================================
  
    with tab1:

                st.subheader("Summary")

                st.write(result["summary"])

                st.write(result.keys())
                
                st.subheader("🎯 Key Takeaways")

                st.write(
                    result.get(
                        "key_takeaways",
                        "Not available. Re-analyze the video."
                    )
                )

                st.subheader("🧠 Important Concepts")

                st.write(
                    result.get(
                        "important_concepts",
                        "Not available. Re-analyze the video."
                    )
                )

                st.subheader("❓ Interesting Questions")

                st.write(
                    result.get(
                        "interesting_questions",
                        "Not available. Re-analyze the video."
                    )
                )

                from utils.pdf_export import (
                    create_summary_pdf
                )

                summary_pdf = "summary.pdf"

                create_summary_pdf(
                    result,
                    summary_pdf
                )

                with open(
                    summary_pdf,
                    "rb"
                ) as file:

                    st.download_button(

                        "📄 Download Summary PDF",

                        data=file,

                        file_name="summary.pdf",

                        mime="application/pdf"
                    )

            # =================================================
            # TRANSCRIPT TAB
            # =================================================

    with tab2:

                st.text_area(
                    "Transcript",
                    result["transcript"],
                    height=400
                )

                st.download_button(
                    "Download Transcript",
                    data=result["transcript"],
                    file_name="transcript.txt"
                )

    # =================================================
    # CHAT TAB
    # =================================================
if 'tab3' in locals():

    with tab3:

    # =============================================
    # DISPLAY CHAT HISTORY
    # =============================================

            for msg in st.session_state.chat_histories[chat_key]:

                with st.chat_message(msg["role"]):

                    st.markdown(msg["content"])

                    if (
                        msg["role"] == "assistant"
                        and "sources" in msg
                        and msg["sources"]
                    ):

                        with st.expander("📚 Sources Used"):

                            for source in msg["sources"]:

                                st.markdown(
                                    f"📹 {source.get('video_title', 'Unknown Video')}"
                                )
                                st.markdown(
                                    f"### ⏱ {source['timestamp']}"
                                )

                                if (
                                    st.session_state.video_url
                                    and source.get("start_seconds") is not None
                                ):

                                    separator = (
                                        "&"
                                        if "?" in st.session_state.video_url
                                        else "?"
                                    )

                                    jump_url = (
                                        f"{st.session_state.video_url}"
                                        f"{separator}t={source['start_seconds']}s"
                                    )

                                    st.markdown(
                                        f"[▶ Jump to Timestamp]({jump_url})"
                                    )

                                st.markdown(
                                    f"{source['preview']}..."
                                )

            # =============================================
            # USER INPUT
            # =============================================
            prefill = st.session_state.get(
                "prefill_question",
                ""
            )

            question = st.chat_input(
                "Ask about the video..."
            )

            if prefill:

                st.info(
                    f"Suggested: {prefill}"
                )

                question = prefill

                st.session_state[
                    "prefill_question"
                ] = ""

            if question:

                st.session_state.chat_histories[
                                chat_key
                            ].append({

                                "role": "user",
                                "content": question

                            })

                with st.chat_message("user"):
                            st.markdown(question)

                with st.chat_message("assistant"):

                        with st.spinner("Thinking..."):

                            history = "\n".join([

                                f"{msg['role']}: {msg['content']}"

                                for msg in st.session_state.chat_histories[
                                    chat_key
                                ]

                            ])


                        stream, sources = stream_answer_multi(

                            st.session_state.workspace,

                            selected_videos,

                            question.strip(),

                            history

                        )

                        placeholder = st.empty()

                        answer = ""

                        for chunk in stream:

                            answer += chunk

                            placeholder.markdown(
                                answer + "▌"
                            )

                        placeholder.markdown(answer)
                        
                        if sources:

                            with st.expander(
                                "📚 Sources Used"
                            ):

                                for source in sources[:3]:
                                    st.markdown(
                                        f"### 📹 {source.get('video_title', 'Unknown Video')}"
                                    )

                                    st.markdown(
                                        f"### ⏱ {source['timestamp']}"
                                    )

                                    if (
                                        st.session_state.video_url
                                        and source.get("start_seconds") is not None
                                    ):

                                        separator = (
                                            "&"
                                            if "?" in st.session_state.video_url
                                            else "?"
                                        )

                                        jump_url = (
                                            f"{st.session_state.video_url}"
                                            f"{separator}t={source['start_seconds']}s"
                                        )

                                        st.markdown(
                                            f"[▶ Jump to Timestamp]({jump_url})"
                                        )

                                    st.markdown(
                                        f"{source['preview']}..."
                                    )

                st.session_state.chat_histories[
                        chat_key
                    ].append({

                        "role": "assistant",
                        "content": answer,
                        "sources": sources

                    })