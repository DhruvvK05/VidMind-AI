from langchain_ollama import ChatOllama

llm = ChatOllama(
    model="llama3"
)

for chunk in llm.stream("What is AI?"):
    print(chunk.content, end="", flush=True)