from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from ..extensions import db
from io import BytesIO

from flask import send_file
from ..services.certificate_pdf_service import generate_certificate_pdf
from ..repositories.certificate_repository import (
    get_student_certificates,
    get_certificate_by_public_id,
)

certificates_bp = Blueprint(
    "certificates",
    __name__,
    url_prefix="/certificates",
)


def serialize_certificate(certificate):
    certificate.pop("_id", None)

    for field in ("issued_at", "created_at"):
        if certificate.get(field):
            certificate[field] = certificate[field].isoformat()

    return certificate


@certificates_bp.get("")
@jwt_required()
def list_certificates():
    if get_jwt().get("role") != "student":
        return jsonify({"error": "Students only"}), 403

    student_id = get_jwt_identity()
    certificates = get_student_certificates(student_id)

    return (
        jsonify(
            {
                "certificates": [
                    serialize_certificate(certificate) for certificate in certificates
                ]
            }
        ),
        200,
    )


@certificates_bp.get("/<certificate_id>")
@jwt_required()
def get_my_certificate(certificate_id):
    if get_jwt().get("role") != "student":
        return jsonify({"error": "Students only"}), 403

    student_id = get_jwt_identity()
    certificate = get_certificate_by_public_id(certificate_id)

    if not certificate or certificate["student_id"] != student_id:
        return jsonify({"error": "Certificate not found"}), 404

    course = db.courses.find_one(
        {"id": certificate["course_id"]},
        {"_id": 0, "title": 1, "description": 1},
    )

    certificate = serialize_certificate(certificate)

    return (
        jsonify(
            {
                "certificate": certificate,
                "course": course,
            }
        ),
        200,
    )


@certificates_bp.get("/verify/<certificate_id>")
def verify_certificate(certificate_id):
    certificate = get_certificate_by_public_id(certificate_id)

    if not certificate:
        return (
            jsonify(
                {
                    "valid": False,
                    "error": "Certificate not found",
                }
            ),
            404,
        )

    course = db.courses.find_one(
        {"id": certificate["course_id"]},
        {"_id": 0, "title": 1},
    )

    return (
        jsonify(
            {
                "valid": True,
                "certificate_id": certificate["certificate_id"],
                "course_title": course["title"] if course else None,
                "issued_at": certificate["issued_at"].isoformat(),
            }
        ),
        200,
    )


@certificates_bp.get("/<certificate_id>/download")
@jwt_required()
def download_certificate(certificate_id):
    if get_jwt().get("role") != "student":
        return jsonify({"error": "Students only"}), 403

    student_id = get_jwt_identity()

    certificate = get_certificate_by_public_id(certificate_id)

    if not certificate or certificate["student_id"] != student_id:
        return jsonify({"error": "Certificate not found"}), 404

    course = db.courses.find_one(
        {"id": certificate["course_id"]},
        {"_id": 0, "title": 1},
    )

    if not course:
        return jsonify({"error": "Course not found"}), 404

    student = db.users.find_one(
        {"id": student_id},
        {"_id": 0, "name": 1},
    )

    if not student:
        return jsonify({"error": "Student not found"}), 404

    pdf_bytes = generate_certificate_pdf(
        student_name=student["name"],
        course_title=course["title"],
        certificate_id=certificate["certificate_id"],
        issued_at=certificate["issued_at"],
    )

    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{certificate['certificate_id']}.pdf",
    )
