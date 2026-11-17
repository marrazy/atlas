import pytest
from fastapi.testclient import TestClient

from api.app import app

VOLVE = 3420717

@pytest.fixture(scope="session")
def client()-> TestClient:
    return TestClient(app)