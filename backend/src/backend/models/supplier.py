from datetime import datetime, timezone


def create_supplier_document(
    name, contact="", email="", address="", payment_terms=""
):
    return {
        "name": name.strip(),
        "contact": contact.strip(),
        "email": email.strip().lower(),
        "address": address.strip(),
        "payment_terms": payment_terms.strip(),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }