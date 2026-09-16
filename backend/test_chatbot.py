import os
import sys
import logging
import json

logging.basicConfig(level=logging.INFO)

os.environ["GROQ_API_KEY_1"] = "dummy_key_to_bypass_offline_mode"

from fastapi.testclient import TestClient
from main import app
from chatbot.provider import provider_manager, ChatCallResult
import asyncio

# Mock the generate_stream method
async def mock_generate_stream(system_prompt, user_message, messages=None):
    yield "This ", None
    yield "is a ", None
    yield "mock ", None
    yield "LLM ", None
    yield "response ", None
    yield "answering ", None
    yield "your ", None
    if "roadmap" in user_message.lower():
        yield "query. [NAV:roadmap-ml]", None
    else:
        yield "query.", None
        
    yield None, ChatCallResult(
        provider="groq", provider_key_idx=1, model="mock-model", status="success"
    )

provider_manager.generate_stream = mock_generate_stream
provider_manager.load_from_env()

client = TestClient(app)

def test_chatbot():
    print("Starting Streaming Chatbot Tests...")
    
    test_cases = [
        ("Greeting (Short-Circuit)", "Hello!"),
        ("FAQ (Short-Circuit)", "what does ai club do?"),
        ("Navigation (Short-Circuit)", "take me to the ml roadmap"),
        ("Out of Scope", "Can you give me a recipe for a chocolate cake?"),
        ("Normal Query", "What is AI Club DAU and who built the website?"),
    ]
    
    for case_name, message in test_cases:
        print(f"\\n--- Testing: {case_name} ---")
        
        response = client.post("/api/club-chat", json={"message": message, "history": []})
        print(f"RAW TEXT: {repr(response.text)}")
            
if __name__ == '__main__':
    test_chatbot()
