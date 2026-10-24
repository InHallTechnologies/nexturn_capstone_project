from decimal import Decimal, InvalidOperation

from flask import request


def request_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, ({"error": "Request body must be a JSON object"}, 400)
    return data, None


def pagination():
    try:
        page = int(request.args.get("page", "1"))
        per_page = int(request.args.get("per_page", "20"))
    except ValueError:
        return None, ({"error": "page and per_page must be integers"}, 400)

    if page < 1 or per_page < 1 or per_page > 100:
        return None, ({"error": "page must be positive and per_page must be 1-100"}, 400)
    return (page, per_page), None


def paginated(query, page, per_page, serializer):
    total = query.count()
    rows = (
        query.order_by(query.column_descriptions[0]["entity"].id)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {
        "items": [serializer(row) for row in rows],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page,
        },
    }


def sort_query(query, fields, default="id"):
    sort_by = request.args.get("sort_by", default)
    sort_order = request.args.get("sort_order", "asc").lower()
    if sort_by not in fields or sort_order not in {"asc", "desc"}:
        return None, (
            {
                "error": "sort_by must be a supported field and sort_order must be asc or desc"
            },
            400,
        )
    column = fields[sort_by]
    return query.order_by(column.desc() if sort_order == "desc" else column.asc()), None


def decimal_value(value):
    return str(value) if isinstance(value, Decimal) else value


def parse_positive_integer(value, label):
    if isinstance(value, bool):
        raise ValueError(f"{label} must be a positive integer")
    try:
        parsed = Decimal(str(value))
    except (ValueError, TypeError, InvalidOperation):
        raise ValueError(f"{label} must be a positive integer")
    if not parsed.is_finite() or parsed != parsed.to_integral_value() or parsed <= 0:
        raise ValueError(f"{label} must be a positive integer")
    return int(parsed)
