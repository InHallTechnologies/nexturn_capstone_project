def validate_register(data):
    if not isinstance(data, dict):
        return {"error": "Missing request body"}, 400

    name = data.get("name")
    email = data.get("email")
    password=data.get("password")

    for value in (name, email, password):
        if not isinstance(value, str) or not value.strip():
            return {"error": "All fields must be non-empty strings"}, 400
    email = email.strip().lower()

    if len(name.strip()) > 100:
        return {"error": "Name cannot exceed 100 characters"}, 400
    if len(email) > 255:
        return {"error": "Email cannot exceed 255 characters"}, 400

    if len(password) < 8:
        return {"error": "Password must be at least 8 characters"}, 400

    if len(password.encode("utf-8")) > 72:
        return {"error": "Password cannot exceed 72 UTF-8 bytes"}, 400

    return {
        "name": name.strip(),
        "email": email,
        "password": password,
        "role": "Staff",
    }


def validate_login(data):
    if not isinstance(data, dict):
        return {"error": "Missing request body"}, 400

    email = data.get("email")
    password = data.get("password")

    for value in (email, password):
        if not isinstance(value, str) or not value.strip():
            return {"error": "All fields must be non-empty strings"}, 400
    email = email.strip().lower()

    return {
        "email": email,
        "password": password,
    }