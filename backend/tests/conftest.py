import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ.setdefault("SECRET_KEY", "pytest-test-secret-key-at-least-32-bytes")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base
from backend.models.user import User
from backend.utils.jwt_handler import tokenizing
from backend.main import app
from backend.routes import (
    auth,
    categories,
    products,
    suppliers,
    purchase_orders,
    sales,
    stock_movements,
    reports,
)
from backend.utils import middleware


@pytest.fixture
def api():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_sessions = sessionmaker(bind=engine, expire_on_commit=False)

    for module in (
        auth,
        categories,
        products,
        suppliers,
        purchase_orders,
        sales,
        stock_movements,
        reports,
        middleware,
    ):
        module.SessionLocal = test_sessions

    with test_sessions() as db:
        db.add_all(
            [
                User(
                    name=role,
                    email=f"{role.lower()}@example.test",
                    password="not-used-by-token-tests",
                    role=role,
                )
                for role in ("Owner", "Manager", "Staff")
            ]
        )
        db.commit()

    client = app.test_client()
    tokens = {
        role: tokenizing(f"{role.lower()}@example.test", role)
        for role in ("Owner", "Manager", "Staff")
    }

    yield {
        "client": client,
        "sessions": test_sessions,
        "tokens": tokens,
    }

    Base.metadata.drop_all(engine)
    engine.dispose()


def request(api, method, path, role=None, json=None, token=None):
    access_token = token or (api["tokens"][role] if role else None)
    headers = (
        {"Authorization": f"Bearer {access_token}"}
        if access_token
        else {}
    )
    return getattr(api["client"], method)(
        path,
        headers=headers,
        json=json,
    )
