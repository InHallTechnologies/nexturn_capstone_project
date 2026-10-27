from datetime import date, datetime
from datetime import timezone
from time import sleep
from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from common import (
    add_review_event,
    client_project,
    current_user,
    decimal,
    error,
    invoice_payload,
    money,
    new_id,
    normalize_project_code,
    new_project_code,
    page_from_request,
    positive_rate,
    project_workflow_payload,
    role_required,
)
from storage import collection, get, insert, output, remove, update, identifier_values
portal_bp = Blueprint("portal", __name__, url_prefix="/api")
def visible_invoices(user):
    clients = list(collection("clients").find({"email": user["email"]}))
    client_ids = [client["id"] for client in clients]
    return list(collection("invoices").find({"client_id": {"$in": client_ids}, "status": {"$ne": "draft"}}))
def post_payload(post):
    user = get("users", post["client_user_id"])
    access = collection("project_post_codes").find_one({"post_id": {"$in": identifier_values(post["id"])}})
    data = output(post)
    data["client_name"] = (user.get("business_name") or user["email"]) if user else "Client"
    data["client_email"] = user["email"] if user else ""
    data["claimed"] = bool(access and access.get("project_id"))
    return data
def issue_code(post):
    access = collection("project_post_codes").find_one({"post_id": {"$in": identifier_values(post["id"])}})
    for attempt in range(5):
        code = normalize_project_code(new_project_code())
        try:
            if collection("project_post_codes").find_one({"project_code": code}):
                continue
            if access:
                update("project_post_codes", access["id"], {"project_code": code})
            else:
                insert("project_post_codes", {"post_id": post["id"], "project_code": code, "project_id": None})
            return code
        except Exception:
            if attempt == 4:
                raise
            sleep(0.15)
@portal_bp.get("/portal/projects")
@role_required("client")
def projects():
    user = current_user()
    client_ids = [client["id"] for client in collection("clients").find({"email": user["email"]})]
    items = list(collection("projects").find({"client_id": {"$in": client_ids}}))
    return {"items": [project_workflow_payload(item) for item in items], "total": len(items)}
@portal_bp.get("/portal/projects/<string:project_id>")
@role_required("client")
def project_detail(project_id):
    project = client_project(project_id)
    if not project:
        return error("Project not found", 404)
    return project_workflow_payload(project)
@portal_bp.post("/portal/projects/<string:project_id>/review")
@role_required("client")
def review_project(project_id):
    project = client_project(project_id)
    if not project:
        return error("Project not found", 404)
    if project["workflow_status"] != "submitted":
        return error("Only submitted work can be reviewed", 409)
    data = request.get_json() or {}
    action = data.get("action")
    feedback = str(data.get("feedback", "")).strip()
    if action not in ("approve", "request_revision"):
        return error("Action must be approve or request_revision", 400)
    if action == "request_revision" and not feedback:
        return error("Feedback is required when requesting revisions", 400)
    if len(feedback) > 5000:
        return error("Feedback cannot exceed 5000 characters", 400)
    project = update(
        "projects",
        project_id,
        {
            "workflow_status": "completed" if action == "approve" else "revision_requested",
            "status": "closed" if action == "approve" else project.get("status", "active"),
            "revision_feedback": feedback if action == "request_revision" else None,
            "reviewed_at": date.today().isoformat(),
        },
    )
    add_review_event(project_id, get_jwt_identity(), action, feedback)
    return project_workflow_payload(project)
@portal_bp.get("/portal/invoices")
@role_required("client")
def invoices():
    items = visible_invoices(current_user())
    result, problem = page_from_request(items, {"id", "issue_date", "due_date", "status"})
    if problem:
        return problem
    result["items"] = [invoice_payload(item) for item in result["items"]]
    return result
@portal_bp.get("/portal/invoices/<string:invoice_id>")
@role_required("client")
def invoice_detail(invoice_id):
    invoice = get("invoices", invoice_id)
    visible_ids = {item["id"] for item in visible_invoices(current_user())}
    if not invoice or invoice["id"] not in visible_ids:
        return error("Invoice not found", 404)
    return invoice_payload(invoice)
@portal_bp.get("/portal/payments")
@role_required("client")
def payments():
    items = []
    for invoice in visible_invoices(current_user()):
        items.extend(invoice.get("payments", []))
    result, problem = page_from_request(items, {"id", "paid_on", "invoice_id"})
    return problem or result
@portal_bp.route("/portal/project-posts", methods=["GET", "POST"])
@role_required("client")
def project_posts():
    user = current_user()
    if request.method == "POST":
        data = request.get_json() or {}
        title = str(data.get("title", "")).strip()
        description = str(data.get("description", "")).strip()
        contact = str(data.get("contact_details", "")).strip()
        if not title or not description or not contact:
            return error("title, description and contact_details are required", 400)
        if len(title) > 180 or len(description) > 5000 or len(contact) > 500:
            return error("Post exceeds the allowed length", 400)
        try:
            hourly_rate = positive_rate(data.get("hourly_rate"))
        except Exception:
            return error("A valid positive hourly_rate is required", 400)
        post = insert("project_posts", {"client_user_id": user["id"], "title": title, "description": description, "hourly_rate": hourly_rate, "contact_details": contact, "created_at": datetime.now(timezone.utc)})
        try:
            code = issue_code(post)
        except Exception:
            remove("project_posts", post["id"])
            return error("The project code could not be created. Please try again.", 503)
        payload = post_payload(post)
        payload["project_code"] = code
        return payload, 201
    items = list(collection("project_posts").find({"client_user_id": {"$in": identifier_values(user["id"])}}))
    result, problem = page_from_request(items, {"id", "created_at", "title"})
    if problem:
        return problem
    result["items"] = [post_payload(get("project_posts", item["id"])) for item in result["items"]]
    return result
@portal_bp.route("/portal/project-posts/<string:post_id>", methods=["GET", "PUT", "DELETE"])
@role_required("client")
def project_post_detail(post_id):
    post = get("project_posts", post_id)
    if not post or str(post["client_user_id"]) != str(get_jwt_identity()):
        return error("Project post not found", 404)
    access = collection("project_post_codes").find_one({"post_id": {"$in": identifier_values(post_id)}})
    if access and access.get("project_id"):
        if request.method != "GET":
            return error("A claimed project post cannot be changed or deleted", 409)
    if request.method == "GET":
        return post_payload(post)
    if request.method == "DELETE":
        if access:
            remove("project_post_codes", access["id"])
        remove("project_posts", post_id)
        return {"message": "Project post deleted"}
    data = request.get_json() or {}
    changes = {}
    for key, max_length in (("title", 180), ("description", 5000), ("contact_details", 500)):
        if key in data:
            value = str(data[key]).strip()
            if not value:
                return error(f"{key} cannot be empty", 400)
            if len(value) > max_length:
                return error(f"{key} exceeds the allowed length", 400)
            changes[key] = value
    if "hourly_rate" in data:
        try:
            changes["hourly_rate"] = positive_rate(data["hourly_rate"])
        except Exception:
            return error("Hourly rate must be a positive numeric amount", 400)
    return post_payload(update("project_posts", post_id, changes))

@portal_bp.post("/portal/project-posts/<string:post_id>/regenerate-code")
@role_required("client")
def regenerate_code(post_id):
    post = get("project_posts", post_id)
    if not post or str(post["client_user_id"]) != str(get_jwt_identity()):
        return error("Project post not found", 404)
    access = collection("project_post_codes").find_one({"post_id": {"$in": identifier_values(post_id)}})
    if access and access.get("project_id"):
        return error("This post is already linked to a project", 409)
    try:
        code = issue_code(post)
    except Exception:
        return error("The project code could not be generated. Please try again.", 503)
    return {"message": "A new project code was generated. Share it directly with the freelancer.", "project_code": code}

@portal_bp.post("/portal/invoices/<string:invoice_id>/pay")
@role_required("client")
def pay_invoice(invoice_id):
    invoice = get("invoices", invoice_id)
    visible_ids = {item["id"] for item in visible_invoices(current_user())}
    if not invoice or invoice["id"] not in visible_ids:
        return error("Invoice not found", 404)
    if invoice["status"] == "draft":
        return error("Draft invoices cannot be paid", 409)
    balance = money(decimal(invoice["total"]) - decimal(invoice["amount_paid"]))
    if balance <= 0:
        return error("This invoice is already paid", 409)
    data = request.get_json() or {}
    method = str(data.get("payment_method", "")).strip().lower()
    if method not in ("cash", "card"):
        return error("payment_method must be cash or card", 400)
    try:
        amount = money(data.get("amount"))
    except Exception:
        return error("A valid payment amount is required", 400)
    reference = str(data.get("transaction_reference", "")).strip()
    if amount <= 0:
        return error("Payment amount must be greater than zero", 400)
    if amount > balance:
        return error("Payment amount exceeds the remaining balance", 409)
    if reference and (len(reference) < 4 or len(reference) > 80):
        return error("transaction_reference must be between 4 and 80 characters", 400)
    payment = {
        "id": new_id(),
        "invoice_id": invoice_id,
        "amount": amount,
        "paid_on": date.today().isoformat(),
        "method": "Cash" if method == "cash" else "Card",
        "reference": reference or f"PORTAL-{new_project_code().replace('-', '')[:12]}",
    }
    invoice["payments"] = invoice.get("payments", []) + [payment]
    invoice["amount_paid"] = money(decimal(invoice["amount_paid"]) + decimal(amount))
    updated = update("invoices", invoice_id, {"payments": invoice["payments"], "amount_paid": invoice["amount_paid"]})
    project_id = updated.get("project_id") if updated else None
    if project_id:
        project_bills = list(collection("invoices").find({"project_id": {"$in": identifier_values(project_id)}}))
        project = get("projects", project_id)
        if project and project.get("workflow_status") == "completed" and project_bills and all(decimal(bill.get("amount_paid", 0)) >= decimal(bill.get("total", 0)) for bill in project_bills):
            update("projects", project_id, {"workflow_status": "closed", "status": "closed"})
    return {"message": "Payment recorded", "payment": output(payment), "invoice": invoice_payload(updated)}, 201
