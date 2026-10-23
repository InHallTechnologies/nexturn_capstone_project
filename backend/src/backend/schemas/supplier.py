
def validate_supplier(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")

    name = data.get("name")
    contact = data.get("contact", "")
    email = data.get("email", "")
    address = data.get("address", "")
    payment_terms = data.get("payment_terms", "")

    fields = {
        "name": name,
        "contact": contact,
        "email": email,
        "address": address,
        "payment_terms": payment_terms,
    }

    for field, value in fields.items():
        if not isinstance(value, str):
            raise ValueError(f"{field} must be a string")

    name = name.strip()
    contact = contact.strip()
    email = email.strip().lower()
    address = address.strip()
    payment_terms = payment_terms.strip()

    if not name:
        raise ValueError("Supplier name is required")

    if len(name) > 150:
        raise ValueError("Supplier name cannot exceed 150 characters")

    if len(contact) > 30:
        raise ValueError("Contact cannot exceed 30 characters")

    if len(email) > 255:
        raise ValueError("Email cannot exceed 255 characters")

    if len(address) > 500:
        raise ValueError("Address cannot exceed 500 characters")

    if len(payment_terms) > 100:
        raise ValueError("Payment terms cannot exceed 100 characters")

    return {
        "name": name,
        "contact": contact,
        "email": email,
        "address": address,
        "payment_terms": payment_terms,
    }
