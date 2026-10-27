from datetime import datetime, timezone
from uuid import uuid4

from pymongo.errors import DuplicateKeyError

from ..extensions import db

certificates_collection = db.certificates


def create_certificate(student_id, course_id):
    existing = certificates_collection.find_one(
        {"student_id": student_id, "course_id": course_id}
    )

    if existing:
        return existing, False

    now = datetime.now(timezone.utc)

    certificate = {
        "id": str(uuid4()),
        "certificate_id": f"CERT-{uuid4().hex[:12].upper()}",
        "student_id": student_id,
        "course_id": course_id,
        "issued_at": now,
        "created_at": now,
    }

    try:
        certificates_collection.insert_one(certificate)
        return certificate, True
    except DuplicateKeyError:
        # A concurrent request may already have created it.
        existing = certificates_collection.find_one(
            {"student_id": student_id, "course_id": course_id}
        )

        if existing:
            return existing, False

        raise


def get_student_certificates(student_id):
    return list(
        certificates_collection.find({"student_id": student_id}, {"_id": 0}).sort(
            "issued_at", -1
        )
    )


def get_certificate_by_public_id(certificate_id):
    return certificates_collection.find_one(
        {"certificate_id": certificate_id}, {"_id": 0}
    )
