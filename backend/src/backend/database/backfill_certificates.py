from ..extensions import db
from ..repositories.certificate_repository import create_certificate


def backfill_certificates():
    enrollments = db.enrollments.find({"status": "completed"})

    created_count = 0
    existing_count = 0

    for enrollment in enrollments:
        student_id = enrollment["student_id"]
        course_id = enrollment["course_id"]

        certificate, created = create_certificate(
            student_id=student_id, course_id=course_id
        )

        if created:
            created_count += 1
            print(
                f"Created certificate {certificate['certificate_id']} "
                f"for student {student_id}, course {course_id}"
            )
        else:
            existing_count += 1

    print(f"\nNew certificates: {created_count}")
    print(f"Already existed: {existing_count}")


if __name__ == "__main__":
    backfill_certificates()
