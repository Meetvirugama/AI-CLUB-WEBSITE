import pytest
from unittest.mock import MagicMock, AsyncMock
from registrations.validators import check_not_already_registered, RegistrationError

@pytest.mark.asyncio
async def test_check_not_already_registered_duplicate():
    mock_session = AsyncMock()
    # Mocking the session.execute().scalars().first() to return a record (indicating duplicate)
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = MagicMock()
    mock_session.execute.return_value = mock_result
    
    with pytest.raises(RegistrationError) as exc:
        await check_not_already_registered(mock_session, event_id=1, user_id=1)
        
    assert exc.value.status_code == 409
    assert "already registered" in exc.value.message

@pytest.mark.asyncio
async def test_check_not_already_registered_ok():
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_session.execute.return_value = mock_result
    
    # Should not raise
    await check_not_already_registered(mock_session, event_id=1, user_id=2)
