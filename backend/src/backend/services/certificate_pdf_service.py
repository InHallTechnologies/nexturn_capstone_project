from datetime import datetime, timezone
from io import BytesIO

import pymupdf


def generate_certificate_pdf(
    student_name: str,
    course_title: str,
    certificate_id: str,
    issued_at=None,
) -> bytes:
    """Generate a course completion certificate as PDF bytes."""

    if issued_at is None:
        issued_at = datetime.now(timezone.utc)

    if isinstance(issued_at, str):
        issued_at = datetime.fromisoformat(issued_at.replace("Z", "+00:00"))

    if issued_at.tzinfo is not None:
        issued_at = issued_at.astimezone(timezone.utc)

    issue_date = issued_at.strftime("%d %B %Y")

    document = pymupdf.open()
    page = document.new_page(width=842, height=595)

    # Certificate background and decorative borders.
    page.draw_rect(
        page.rect,
        color=(0.08, 0.24, 0.23),
        width=8,
    )

    page.draw_rect(
        pymupdf.Rect(22, 22, 820, 573),
        color=(0.85, 0.65, 0.25),
        width=2,
    )

    # Main heading.
    page.insert_textbox(
        pymupdf.Rect(60, 65, 782, 120),
        "CERTIFICATE OF COMPLETION",
        fontname="hebo",
        fontsize=29,
        color=(0.08, 0.24, 0.23),
        align=pymupdf.TEXT_ALIGN_CENTER,
    )

    page.insert_textbox(
        pymupdf.Rect(100, 135, 742, 170),
        "This certificate is proudly presented to",
        fontname="helv",
        fontsize=17,
        color=(0.3, 0.3, 0.3),
        align=pymupdf.TEXT_ALIGN_CENTER,
    )

    # Student name.
    page.insert_textbox(
        pymupdf.Rect(70, 180, 772, 235),
        student_name,
        fontname="tibo",
        fontsize=30,
        color=(0.08, 0.24, 0.23),
        align=pymupdf.TEXT_ALIGN_CENTER,
    )

    page.draw_line(
        pymupdf.Point(180, 242),
        pymupdf.Point(662, 242),
        color=(0.85, 0.65, 0.25),
        width=1.5,
    )

    page.insert_textbox(
        pymupdf.Rect(100, 260, 742, 300),
        "for successfully completing the course",
        fontname="helv",
        fontsize=16,
        color=(0.3, 0.3, 0.3),
        align=pymupdf.TEXT_ALIGN_CENTER,
    )

    # Course title.
    page.insert_textbox(
        pymupdf.Rect(80, 305, 762, 360),
        course_title,
        fontname="hebo",
        fontsize=23,
        color=(0.08, 0.24, 0.23),
        align=pymupdf.TEXT_ALIGN_CENTER,
    )

    page.insert_textbox(
        pymupdf.Rect(80, 400, 400, 435),
        f"Issued on: {issue_date}",
        fontname="helv",
        fontsize=11,
        color=(0.3, 0.3, 0.3),
    )

    page.insert_textbox(
        pymupdf.Rect(420, 400, 762, 435),
        f"Certificate ID: {certificate_id}",
        fontname="helv",
        fontsize=11,
        color=(0.3, 0.3, 0.3),
        align=pymupdf.TEXT_ALIGN_RIGHT,
    )

    page.insert_textbox(
        pymupdf.Rect(100, 480, 742, 510),
        "Verified certificate • Mini LMS",
        fontname="helv",
        fontsize=12,
        color=(0.3, 0.3, 0.3),
        align=pymupdf.TEXT_ALIGN_CENTER,
    )

    pdf_bytes = document.tobytes()
    document.close()

    return pdf_bytes
