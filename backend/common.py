import uuid
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from flask import request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash
from storage import collection, get, insert, output, update, identifier_values
def money(value):
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
def decimal(value, default="0"):
    return Decimal(str(value if value is not None else default))
def positive_rate(value):
    rate = decimal(value)
    if not rate.is_finite() or rate <= 0 or money(rate) <= 0 or rate > Decimal("99999999.99"):
        raise ValueError("Hourly rate must be a positive amount")
    return money(rate)
def make_password_hash(password):
    return generate_password_hash(password)
def password_matches(password, stored):
    try:
        return check_password_hash(stored, password)
    except (ValueError, TypeError):
        return False
def new_project_code():
    value = uuid.uuid4().hex.upper()
    return "-".join((value[:4], value[4:8], value[8:12]))
def new_id():
    return str(uuid.uuid4())
def normalize_project_code(code):
    return code.strip().upper()
def new_invoice_number():
    return f"INV-{date.today():%Y%m}-{uuid.uuid4().hex[:8].upper()}"
def error(message, status):
    return {"error": message}, status
def current_user():
    return get("users", get_jwt_identity())
def public_user(user):
    data = output(user)
    data.pop("password_hash", None)
    return data
def role_required(*roles):
    def decorate(function):
        @jwt_required()
        def authorize(*args, **kwargs):
            user = current_user()
            if user is None:
                return error("Account not found", 401)
            if user["role"] not in roles:
                return error("You do not have access to this resource", 403)
            return function(*args, **kwargs)
        authorize.__name__ = function.__name__
        authorize.__doc__ = function.__doc__
        return authorize
    return decorate
def owned_client(client_id):
    return collection("clients").find_one(
        {"id": {"$in": identifier_values(client_id)}, "owner_id": {"$in": identifier_values(get_jwt_identity())}}
    )
def owned_project(project_id):
    project = get("projects", project_id)
    if not project:
        return None
    client = get("clients", project["client_id"])
    if not client or str(client["owner_id"]) != str(get_jwt_identity()):
        return None
    return project
def client_project(project_id):
    project = get("projects", project_id)
    user = current_user()
    if not project or not user:
        return None
    client = get("clients", project["client_id"])
    if not client or client["email"] != user["email"]:
        return None
    return project
def project_workflow_payload(project):
    data = output(project)
    client = get("clients", project["client_id"])
    data["client_name"] = client["name"] if client else "Client"
    events = collection("review_events").find(
        {"project_id": project["id"]}, sort=[("created_at", 1)]
    )
    data["review_events"] = [output(event) for event in events]
    final_invoice = collection("invoices").find_one(
        {"project_id": project["id"], "is_final": True}
    )
    data["final_invoice_id"] = final_invoice["id"] if final_invoice else None
    data["project_status"] = project.get("status", "active")
    if final_invoice:
        paid = decimal(final_invoice.get("amount_paid", 0))
        total = decimal(final_invoice.get("total", 0))
        data["payment_status"] = "paid" if paid >= total else ("partially_paid" if paid > 0 else "pending")
        data["payment_due"] = money(max(total - paid, Decimal("0")))
    else:
        data["payment_status"] = "not_invoiced"
        data["payment_due"] = 0
    return data
def refresh_invoice(invoice):
    if invoice["status"] == "draft":
        return invoice
    if invoice["amount_paid"] >= invoice["total"]:
        invoice["status"] = "paid"
    elif invoice["amount_paid"] > 0:
        invoice["status"] = "partially_paid"
    elif invoice["due_date"] < date.today().isoformat():
        invoice["status"] = "overdue"
    elif invoice["status"] not in ("draft", "sent"):
        invoice["status"] = "sent"
    update("invoices", invoice["id"], {"status": invoice["status"]})
    return invoice
def invoice_payload(invoice):
    refresh_invoice(invoice)
    client = get("clients", invoice["client_id"])
    owner = get("users", client["owner_id"]) if client else None
    payload = output(invoice)
    payload["line_items"] = payload.get("line_items", [])
    payload["payments"] = payload.get("payments", [])
    payload["freelancer_email"] = owner["email"] if owner else ""
    return payload
def page_from_request(items, allowed_sorts):
    from storage import page

    return page(
        items,
        request.args.get("sort", "id"),
        request.args.get("order", "asc").lower(),
        allowed_sorts,
    )
def add_review_event(project_id, actor_id, event_type, message=""):
    insert(
        "review_events",
        {
            "project_id": project_id,
            "actor_id": actor_id,
            "event_type": event_type,
            "message": message,
            "created_at": datetime.now(timezone.utc),
        },
    )
