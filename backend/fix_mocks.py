import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Step 1: Replace the patch string
    content = content.replace('"chatbot.provider.provider_manager.generate"', '"chatbot.provider.provider_manager.generate_stream"')

    # Step 2: Add the mock_stream helper if it's not there and we need it
    if "generate_stream" in content and "def make_mock_stream" not in content:
        helper = """
def make_mock_stream(text, result_obj):
    async def _stream(*args, **kwargs):
        yield text, None
        yield None, result_obj
    return _stream
"""
        # Insert after imports
        content = re.sub(r'(from chatbot.provider import ChatCallResult\n)', r'\1' + helper, content)
        if "ChatCallResult" not in content and "import pytest" in content:
            content = re.sub(r'(import pytest\n)', r'\1' + helper, content)

    # Step 3: Replace new_callable=AsyncMock, return_value=X with side_effect=make_mock_stream(*X)
    # Pattern: new_callable=AsyncMock,\s*return_value=\(([^,]+),\s*([^\)]+)\)
    content = re.sub(
        r'new_callable=AsyncMock,\s*return_value=\(([^,]+),\s*([^\)]+)\)',
        r'side_effect=make_mock_stream(\1, \2)',
        content
    )
    
    # Also handle single line: new_callable=AsyncMock, return_value=("Safe reply.", _MOCK_RESULT)
    # And what if it's new_callable=AsyncMock, side_effect=Exception(...)
    content = re.sub(
        r'new_callable=AsyncMock,\s*side_effect=(Exception\([^\)]+\))',
        r'side_effect=\1',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)

for f in os.listdir('tests'):
    if f.startswith('test_') and f.endswith('.py'):
        fix_file(os.path.join('tests', f))
