from datetime import datetime, timezone


def create_category_document(name, description=""):
    return {
        "name": name.strip(),
        "description": description.strip(),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }