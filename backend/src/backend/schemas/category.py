
def validate_category(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")

    name = data.get("name")
    description = data.get("description", "")

    if not isinstance(name, str):
        raise ValueError("Category name must be a string")

    if not isinstance(description, str):
        raise ValueError("Description must be a string")

    name = name.strip()
    description = description.strip()

    if not name:
        raise ValueError("Category name is required")

    if len(name) > 100:
        raise ValueError("Category name cannot exceed 100 characters")

    if len(description) > 500:
        raise ValueError("Description cannot exceed 500 characters")

    return {
        "name": name,
        "description": description,
    }
