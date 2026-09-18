import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from forms.file_handler import validate_upload
from fastapi.datastructures import UploadFile
from io import BytesIO

@pytest.mark.asyncio
async def test_validate_upload_success(monkeypatch):
    monkeypatch.setattr("forms.file_handler._sniff_mime", lambda x: "image/png")
    
    file_obj = BytesIO(b"dummy image data")
    upload = UploadFile(filename="test.png", file=file_obj, size=16)
    
    # Should succeed without raising
    result = await validate_upload(upload, max_size_kb=10, allowed_types="image/png,image/jpeg")
    assert result == b"dummy image data"

@pytest.mark.asyncio
async def test_validate_upload_size_limit(monkeypatch):
    monkeypatch.setattr("forms.file_handler._sniff_mime", lambda x: "image/png")
    file_obj = BytesIO(b"a" * 2048) # 2KB
    upload = UploadFile(filename="test.png", file=file_obj, size=2048)
    
    with pytest.raises(HTTPException) as exc:
        await validate_upload(upload, max_size_kb=1, allowed_types="image/png")
    
    assert exc.value.status_code == 413

@pytest.mark.asyncio
async def test_validate_upload_invalid_mime(monkeypatch):
    monkeypatch.setattr("forms.file_handler._sniff_mime", lambda x: "text/plain")
    
    file_obj = BytesIO(b"plain text")
    upload = UploadFile(filename="test.txt", file=file_obj, size=10)
    
    with pytest.raises(HTTPException) as exc:
        await validate_upload(upload, max_size_kb=10, allowed_types="image/png")
    
    assert exc.value.status_code == 415
