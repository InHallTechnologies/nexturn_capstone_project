from datetime import date, timedelta
from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from common import (
    add_review_event,
    current_user,
    decimal,
    error,
    invoice_payload,
    money,
    new_id,
    new_invoice_number,
    new_project_code,
    owned_client,
    owned_project,
    page_from_request,
    positive_rate,
    project_workflow_payload,
    role_required,
)
from storage import collection, get, insert, output, remove, update, identifier_values
freelancer_bp = Blueprint("freelancer", __name__, url_prefix="/api")
def invoice_items_for_owner(owner_id):
    client_ids = [item["id"] for item in collection("clients").find({"owner_id": {"$in": identifier_values(owner_id)}})]
    return list(collection("invoices").find({"client_id": {"$in": client_ids}}))
def close_project_if_fully_paid(project_id):
    if not project_id:
        return
    project = get("projects", project_id)
    bills = list(collection("invoices").find({"project_id": {"$in": identifier_values(project_id)}}))
    if project and project.get("workflow_status") == "completed" and bills and all(decimal(bill.get("amount_paid", 0)) >= decimal(bill.get("total", 0)) for bill in bills):
        update("projects", project_id, {"workflow_status": "closed", "status": "closed"})
@freelancer_bp.route("/clients", methods=["GET", "POST"])
@role_required("freelancer")
def clients():
    owner_id = get_jwt_identity()
    if request.method == "POST":
        data = request.get_json() or {}
        if not data.get("name") or not data.get("email"):
            return error("name and email are required", 400)
        rate = money(data.get("default_hourly_rate", 0))
        if rate < 0:
            return error("Hourly rate cannot be negative", 400)
        client = insert(
            "clients",
            {
                "owner_id": owner_id,
                "name": str(data["name"]).strip(),
                "email": str(data["email"]).strip().lower(),
                "billing_address": data.get("billing_address", ""),
                "default_hourly_rate": rate,
            },
        )
        return output(client), 201
    items = list(collection("clients").find({"owner_id": {"$in": identifier_values(owner_id)}}))
    search = request.args.get("q")
    if search:
        items = [item for item in items if search.lower() in item["name"].lower()]
    result, problem = page_from_request(items, {"id", "name", "email"})
    return problem or result
@freelancer_bp.route("/clients/<string:client_id>", methods=["GET", "PUT", "DELETE"])
@role_required("freelancer")
def client_detail(client_id):
    client = owned_client(client_id)
    if not client:
        return error("Client not found", 404)
    if request.method == "GET":
        return output(client)
    if request.method == "DELETE":
        if collection("projects").find_one({"client_id": {"$in": identifier_values(client_id)}}):
            return error("Delete the client's projects and invoices first", 409)
        remove("clients", client_id)
        return {"message": "Client deleted"}
    data = request.get_json() or {}
    changes = {}
    for key in ("name", "email", "billing_address"):
        if key in data:
            changes[key] = data[key]
    if "default_hourly_rate" in data:
        rate = money(data["default_hourly_rate"])
        if rate < 0:
            return error("Hourly rate cannot be negative", 400)
        changes["default_hourly_rate"] = rate
    return output(update("clients", client_id, changes))

@freelancer_bp.route("/projects", methods=["GET", "POST"])
@role_required("freelancer")
def projects():
    owner_id = get_jwt_identity()
    if request.method == "POST":
        data = request.get_json() or {}
        client = owned_client(data.get("client_id", -1))
        if not client:
            return error("Owned client_id is required", 400)
        if not data.get("title"):
            return error("title is required", 400)
        try:
            rate = positive_rate(data["rate_override"]) if data.get("rate_override") is not None else None
        except Exception:
            return error("Rate override must be a positive numeric amount", 400)
        status = data.get("status", "active")
        if status not in ("active", "on_hold", "closed"):
            return error("Invalid project status", 400)
        project = insert(
            "projects",
            {
                "client_id": client["id"],
                "title": data["title"],
                "rate_override": rate,
                "status": status,
                "workflow_status": "active",
                "completion_notes": None,
                "revision_feedback": None,
                "submitted_at": None,
                "reviewed_at": None,
            },
        )
        return output(project), 201
    client_ids = [item["id"] for item in collection("clients").find({"owner_id": {"$in": identifier_values(owner_id)}})]
    items = list(collection("projects").find({"client_id": {"$in": client_ids}}))
    if request.args.get("client_id"):
        items = [item for item in items if item["client_id"] == request.args["client_id"]]
    result, problem = page_from_request(items, {"id", "title", "status", "workflow_status"})
    if problem:
        return problem
    result["items"] = [project_workflow_payload(get("projects", item["id"])) for item in result["items"]]
    return result

@freelancer_bp.route("/projects/<string:project_id>", methods=["GET", "PUT", "DELETE"])
@role_required("freelancer")
def project_detail(project_id):
    project = owned_project(project_id)
    if not project:
        return error("Project not found", 404)
    if request.method == "GET":
        return project_workflow_payload(project)
    if request.method == "DELETE":
        if collection("time_entries").find_one({"project_id": project_id}):
            return error("Delete the project's time entries first", 409)
        remove("projects", project_id)
        return {"message": "Project deleted"}
    data = request.get_json() or {}
    changes = {}
    for key in ("title", "status"):
        if key in data:
            changes[key] = data[key]
    if changes.get("status") and changes["status"] not in ("active", "on_hold", "closed"):
        return error("Invalid project status", 400)
    if "rate_override" in data:
        if data["rate_override"] is None and collection("project_post_codes").find_one({"project_id": project_id}):
            return error("A client-offered project rate cannot be cleared; enter another positive rate instead", 400)
        try:
            changes["rate_override"] = positive_rate(data["rate_override"]) if data["rate_override"] is not None else None
        except Exception:
            return error("Rate override must be a positive numeric amount", 400)
    return output(update("projects", project_id, changes))

@freelancer_bp.post("/projects/<string:project_id>/submit")
@role_required("freelancer")
def submit_project(project_id):
    project = owned_project(project_id)
    if not project:
        return error("Project not found", 404)
    if project["status"] == "closed" or project["workflow_status"] not in ("active", "revision_requested"):
        return error("Only active work or requested revisions can be submitted", 409)
    data = request.get_json() or {}
    notes = str(data.get("notes", "")).strip()
    if not notes:
        return error("Completion notes are required", 400)
    if len(notes) > 5000:
        return error("Completion notes cannot exceed 5000 characters", 400)
    changes = {
        "workflow_status": "submitted",
        "completion_notes": notes,
        "revision_feedback": None,
        "submitted_at": date.today().isoformat(),
    }
    project = update("projects", project_id, changes)
    add_review_event(project_id, get_jwt_identity(), "submitted", notes)
    return project_workflow_payload(project)

@freelancer_bp.post("/projects/<string:project_id>/final-invoice")
@role_required("freelancer")
def create_final_invoice(project_id):
    project = owned_project(project_id)
    if not project:
        return error("Project not found", 404)
    if project["workflow_status"] != "completed":
        return error("Client approval is required before creating the final invoice", 409)
    if collection("invoices").find_one({"project_id": project_id, "is_final": True}):
        return error("A final invoice already exists for this project", 409)
    entries = list(collection("time_entries").find({"project_id": project_id, "is_billed": False}))
    if not entries:
        return error("There is no unbilled work for this project's final invoice", 409)
    data = request.get_json() or {}
    try:
        tax_rate = decimal(data.get("tax_rate", 0))
        due_days = int(data.get("due_days", 14))
    except Exception:
        return error("Valid tax_rate and due_days are required", 400)
    if tax_rate < 0 or tax_rate > 100 or due_days < 0 or due_days > 365:
        return error("due_days must be 0-365 and tax_rate 0-100", 400)
    project_title = project["title"]
    subtotal = money(sum(decimal(entry["hours"]) * decimal(entry["rate_applied"]) for entry in entries))
    tax = money(decimal(subtotal) * tax_rate / 100)
    invoice = insert(
        "invoices",
        {
            "client_id": project["client_id"],
            "project_id": project_id,
            "is_final": True,
            "number": "TEMP",
            "issue_date": date.today().isoformat(),
            "due_date": (date.today() + timedelta(days=due_days)).isoformat(),
            "status": "draft",
            "subtotal": subtotal,
            "tax": tax,
            "total": money(decimal(subtotal) + decimal(tax)),
            "amount_paid": 0,
            "line_items": [
                {
                    "id": new_id(),
                    "description": f"{project_title}: {entry['description']}",
                    "quantity": entry["hours"],
                    "unit_rate": entry["rate_applied"],
                    "amount": money(decimal(entry["hours"]) * decimal(entry["rate_applied"])),
                }
                for index, entry in enumerate(entries)
            ],
            "payments": [],
        },
    )
    invoice = update("invoices", invoice["id"], {"number": new_invoice_number()})
    for entry in entries:
        update("time_entries", entry["id"], {"is_billed": True, "invoice_id": invoice["id"]})
    add_review_event(project_id, get_jwt_identity(), "final_invoice_created", invoice["number"])
    return invoice_payload(invoice), 201

@freelancer_bp.route("/time-entries", methods=["GET", "POST"])
@role_required("freelancer")
def time_entries():
    owner_id = get_jwt_identity()
    if request.method == "POST":
        data = request.get_json() or {}
        project = owned_project(data.get("project_id", -1))
        if not project:
            return error("Owned project_id is required", 400)
        if project["workflow_status"] == "closed" or project["status"] == "closed":
            return error("Closed projects cannot receive new time entries", 409)
        try:
            hours = decimal(data.get("hours"))
            entered = date.fromisoformat(data.get("date", ""))
        except Exception:
            return error("Valid date and hours are required", 400)
        if hours <= 0 or hours > 24 or not data.get("description"):
            return error("Hours must be greater than 0 and at most 24; description is required", 400)
        client = get("clients", project["client_id"])
        rate = project.get("rate_override") or client["default_hourly_rate"]
        entry = insert(
            "time_entries",
            {
                "project_id": project["id"],
                "entry_date": entered.isoformat(),
                "hours": float(hours),
                "description": data["description"],
                "rate_applied": rate,
                "is_billed": False,
                "invoice_id": None,
            },
        )
        return output(entry), 201
    client_ids = [item["id"] for item in collection("clients").find({"owner_id": {"$in": identifier_values(owner_id)}})]
    project_ids = [item["id"] for item in collection("projects").find({"client_id": {"$in": client_ids}})]
    items = list(collection("time_entries").find({"project_id": {"$in": project_ids}}))
    billed = request.args.get("billed")
    if billed in ("true", "false"):
        items = [item for item in items if item["is_billed"] == (billed == "true")]
    if request.args.get("client_id"):
        selected_client = request.args["client_id"]
        selected_projects = [item["id"] for item in collection("projects").find({"client_id": selected_client})]
        items = [item for item in items if item["project_id"] in selected_projects]
    result, problem = page_from_request(items, {"id", "entry_date"})
    if problem:
        return problem
    for item in result["items"]:
        project = get("projects", item["project_id"])
        item["project_title"] = project["title"] if project else "Project"
    return result

@freelancer_bp.route("/time-entries/<string:entry_id>", methods=["GET", "PUT", "DELETE"])
@role_required("freelancer")
def time_entry_detail(entry_id):
    entry = get("time_entries", entry_id)
    project = owned_project(entry["project_id"]) if entry else None
    if not entry or not project:
        return error("Time entry not found", 404)
    if request.method == "GET":
        return output(entry)
    if entry["is_billed"]:
        return error("Billed time entries are locked", 409)
    if request.method == "DELETE":
        remove("time_entries", entry_id)
        return {"message": "Time entry deleted"}
    data = request.get_json() or {}
    changes = {}
    if "hours" in data:
        hours = decimal(data["hours"])
        if hours <= 0 or hours > 24:
            return error("Hours must be greater than 0 and at most 24", 400)
        changes["hours"] = float(hours)
    if "description" in data:
        changes["description"] = data["description"]
    if "date" in data:
        try:
            changes["entry_date"] = date.fromisoformat(data["date"]).isoformat()
        except ValueError:
            return error("Invalid date", 400)
    return output(update("time_entries", entry_id, changes))

@freelancer_bp.route("/invoices", methods=["GET", "POST"])
@role_required("freelancer")
def invoices():
    owner_id = get_jwt_identity()
    if request.method == "POST":
        data = request.get_json() or {}
        client = owned_client(data.get("client_id", -1))
        ids = data.get("time_entry_ids")
        if not client or not isinstance(ids, list) or not ids:
            return error("Owned client_id and non-empty time_entry_ids are required", 400)
        if len(set(ids)) != len(ids):
            return error("Duplicate time entry ids", 400)
        projects = [item["id"] for item in collection("projects").find({"client_id": client["id"]})]
        entries = list(collection("time_entries").find({"id": {"$in": ids}, "project_id": {"$in": projects}, "is_billed": False}))
        if len(entries) != len(ids):
            return error("One or more entries are billed, missing, or belong to another client", 409)
        try:
            due_days = int(data.get("due_days", 14))
            tax_rate = decimal(data.get("tax_rate", 0))
        except Exception:
            return error("Valid tax_rate and due_days are required", 400)
        if due_days < 0 or due_days > 365 or tax_rate < 0 or tax_rate > 100:
            return error("due_days must be 0-365 and tax_rate 0-100", 400)
        subtotal = money(sum(decimal(entry["hours"]) * decimal(entry["rate_applied"]) for entry in entries))
        tax = money(decimal(subtotal) * tax_rate / 100)
        line_items = []
        for index, entry in enumerate(entries):
            project = get("projects", entry["project_id"])
            line_items.append({"id": new_id(), "description": f"{project['title']}: {entry['description']}", "quantity": entry["hours"], "unit_rate": entry["rate_applied"], "amount": money(decimal(entry["hours"]) * decimal(entry["rate_applied"]))})
        project_ids = {entry.get("project_id") for entry in entries}
        invoice_project_id = next(iter(project_ids)) if len(project_ids) == 1 else None
        invoice = insert("invoices", {"client_id": client["id"], "project_id": invoice_project_id, "is_final": False, "number": "TEMP", "issue_date": date.today().isoformat(), "due_date": (date.today() + timedelta(days=due_days)).isoformat(), "status": "draft", "subtotal": subtotal, "tax": tax, "total": money(decimal(subtotal) + decimal(tax)), "amount_paid": 0, "line_items": line_items, "payments": []})
        invoice = update("invoices", invoice["id"], {"number": new_invoice_number()})
        for entry in entries:
            update("time_entries", entry["id"], {"is_billed": True, "invoice_id": invoice["id"]})
        return invoice_payload(invoice), 201
    items = invoice_items_for_owner(owner_id)
    if request.args.get("client_id"):
        items = [item for item in items if item["client_id"] == request.args["client_id"]]
    if request.args.get("status"):
        items = [item for item in items if item["status"] == request.args["status"]]
    result, problem = page_from_request(items, {"id", "issue_date", "due_date", "status"})
    if problem:
        return problem
    for item in result["items"]:
        client = get("clients", item["client_id"])
        item["client_name"] = client["name"] if client else "Client"
    return result

@freelancer_bp.get("/invoices/<string:invoice_id>")
@role_required("freelancer")
def invoice_detail(invoice_id):
    invoice = get("invoices", invoice_id)
    client = get("clients", invoice["client_id"]) if invoice else None
    if not invoice or not client or str(client["owner_id"]) != str(get_jwt_identity()):
        return error("Invoice not found", 404)
    return invoice_payload(invoice)

@freelancer_bp.put("/invoices/<string:invoice_id>")
@role_required("freelancer")
def update_invoice(invoice_id):
    invoice = get("invoices", invoice_id)
    client = get("clients", invoice["client_id"]) if invoice else None
    if not invoice or not client or str(client["owner_id"]) != str(get_jwt_identity()):
        return error("Invoice not found", 404)
    if invoice["amount_paid"] > 0:
        return error("Invoices with recorded payments cannot be edited", 409)
    data = request.get_json() or {}
    changes = {}
    if "due_date" in data:
        try:
            changes["due_date"] = date.fromisoformat(str(data["due_date"])).isoformat()
        except (TypeError, ValueError):
            return error("due_date must use YYYY-MM-DD", 400)
    if "line_items" in data:
        items = data["line_items"]
        if not isinstance(items, list) or not items or len(items) > 100:
            return error("Provide between 1 and 100 invoice line items", 400)
        lines = []
        try:
            for index, item in enumerate(items):
                description = str(item.get("description", "")).strip()
                quantity = decimal(item.get("quantity"))
                unit_rate = money(item.get("unit_rate"))
                if not description or len(description) > 500 or quantity <= 0 or unit_rate < 0:
                    return error("Each line needs a description, positive quantity and non-negative rate", 400)
                lines.append({"id": new_id(), "description": description, "quantity": float(quantity), "unit_rate": unit_rate, "amount": money(quantity * decimal(unit_rate))})
        except (AttributeError, TypeError, ValueError):
            return error("Invalid invoice line item", 400)
        changes["line_items"] = lines
        changes["subtotal"] = money(sum(decimal(line["quantity"]) * decimal(line["unit_rate"]) for line in lines))
    else:
        changes["subtotal"] = invoice["subtotal"]
    try:
        changes["tax"] = money(data.get("tax", invoice["tax"]))
    except Exception:
        return error("tax must be a valid amount", 400)
    if changes["tax"] < 0:
        return error("tax cannot be negative", 400)
    changes["total"] = money(decimal(changes["subtotal"]) + decimal(changes["tax"]))
    return invoice_payload(update("invoices", invoice_id, changes))

@freelancer_bp.post("/invoices/<string:invoice_id>/send")
@role_required("freelancer")
def send_invoice(invoice_id):
    invoice = get("invoices", invoice_id)
    client = get("clients", invoice["client_id"]) if invoice else None
    if not invoice or not client or str(client["owner_id"]) != str(get_jwt_identity()):
        return error("Invoice not found", 404)
    if invoice["status"] != "draft":
        return error("Only draft invoices can be sent", 409)
    return invoice_payload(update("invoices", invoice_id, {"status": "sent"}))

@freelancer_bp.post("/invoices/<string:invoice_id>/payments")
@role_required("freelancer")
def add_payment(invoice_id):
    invoice = get("invoices", invoice_id)
    client = get("clients", invoice["client_id"]) if invoice else None
    if not invoice or not client or str(client["owner_id"]) != str(get_jwt_identity()):
        return error("Invoice not found", 404)
    data = request.get_json() or {}
    try:
        amount = money(data.get("amount"))
        paid_on = date.fromisoformat(data.get("paid_on", date.today().isoformat())).isoformat()
    except Exception:
        return error("Valid amount and paid_on date are required", 400)
    balance = money(decimal(invoice["total"]) - decimal(invoice["amount_paid"]))
    if amount <= 0:
        return error("Payment must be greater than zero", 400)
    if amount > balance:
        return error("Payment exceeds the remaining balance", 409)
    payment = {"id": new_id(), "invoice_id": invoice_id, "amount": amount, "paid_on": paid_on, "method": data.get("method", "Other"), "reference": data.get("reference", "")}
    invoice["payments"] = invoice.get("payments", []) + [payment]
    invoice["amount_paid"] = money(decimal(invoice["amount_paid"]) + decimal(amount))
    updated = update("invoices", invoice_id, {"payments": invoice["payments"], "amount_paid": invoice["amount_paid"]})
    close_project_if_fully_paid(invoice.get("project_id"))
    return {"payment": output(payment), "invoice": invoice_payload(updated)}, 201

@freelancer_bp.get("/payments")
@role_required("freelancer")
def payments():
    owner_id = get_jwt_identity()
    invoices = invoice_items_for_owner(owner_id)
    items = []
    for invoice in invoices:
        items.extend(invoice.get("payments", []))
    if request.args.get("invoice_id"):
        items = [item for item in items if item["invoice_id"] == request.args["invoice_id"]]
    result, problem = page_from_request(items, {"id", "paid_on", "invoice_id"})
    return problem or result

@freelancer_bp.get("/dashboard")
@role_required("freelancer")
def dashboard():
    owner_id = get_jwt_identity()
    month = request.args.get("month", date.today().strftime("%Y-%m"))
    try:
        year, selected_month = map(int, month.split("-"))
        start = date(year, selected_month, 1).isoformat()
        end = (date(year + 1, 1, 1) if selected_month == 12 else date(year, selected_month + 1, 1)).isoformat()
    except Exception:
        return error("month must use YYYY-MM", 400)
    invoices = invoice_items_for_owner(owner_id)
    earned = 0
    outstanding = 0
    overdue = 0
    client_totals = {}
    for invoice in invoices:
        if invoice["status"] != "draft" and invoice["amount_paid"] < invoice["total"]:
            outstanding += invoice["total"] - invoice["amount_paid"]
            if invoice["due_date"] < date.today().isoformat():
                overdue += 1
        client = get("clients", invoice["client_id"])
        for payment in invoice.get("payments", []):
            if start <= payment["paid_on"] < end:
                earned += payment["amount"]
            client_totals.setdefault(invoice["client_id"], 0)
            client_totals[invoice["client_id"]] += payment["amount"]
    top_clients = []
    for client_id, total in sorted(client_totals.items(), key=lambda item: item[1], reverse=True)[:5]:
        client = get("clients", client_id)
        if client:
            top_clients.append({"client_id": client_id, "name": client["name"], "earnings": total})
    return {"month": month, "monthly_earnings": earned, "outstanding": outstanding, "overdue_count": overdue, "top_clients": top_clients}

@freelancer_bp.get("/project-posts")
@role_required("freelancer")
def project_posts():
    user_id = get_jwt_identity()
    posts = list(collection("project_posts").find({"client_user_id": {"$ne": user_id}}))
    visible = []
    for post in posts:
        access = collection("project_post_codes").find_one({"post_id": post["id"]})
        if not access or not access.get("project_id"):
            payload = output(post)
            client = get("users", post["client_user_id"])
            payload["client_name"] = (client.get("business_name") or client["email"]) if client else "Client"
            payload["client_email"] = client["email"] if client else ""
            payload["claimed"] = False
            visible.append(payload)
    result, problem = page_from_request(visible, {"id", "created_at", "title"})
    return problem or result

@freelancer_bp.get("/project-posts/<string:post_id>")
@role_required("freelancer")
def project_post_detail(post_id):
    post = get("project_posts", post_id)
    if not post or str(post["client_user_id"]) == str(get_jwt_identity()):
        return error("Project post not found", 404)
    access = collection("project_post_codes").find_one({"post_id": post_id})
    if access and access.get("project_id"):
        return error("Project post not found", 404)
    return output(post)

@freelancer_bp.post("/projects/claim-code")
@role_required("freelancer")
def claim_project_post():
    data = request.get_json() or {}
    code = str(data.get("code", "")).strip().upper()
    if not code or len(code) > 32:
        return error("A valid client-issued project code is required", 400)
    access = collection("project_post_codes").find_one({"project_code": code})
    if not access:
        return error("Project code is invalid", 404)
    if access.get("project_id"):
        return error("This project code has already been used", 409)
    post = get("project_posts", access["post_id"])
    client_user = get("users", post["client_user_id"]) if post else None
    if not post or not client_user:
        return error("Project post is no longer available", 404)
    if post.get("hourly_rate") is None:
        return error("This older post has no offered rate. Ask the client to add a positive hourly rate before claiming the code.", 409)
    freelancer = current_user()
    client = collection("clients").find_one({"owner_id": freelancer["id"], "email": client_user["email"]})
    if not client:
        client = insert("clients", {"owner_id": freelancer["id"], "name": client_user.get("business_name") or client_user["email"], "email": client_user["email"], "billing_address": "", "default_hourly_rate": 0})
    project = insert("projects", {"client_id": client["id"], "title": post["title"], "rate_override": post["hourly_rate"], "status": "active", "workflow_status": "active", "completion_notes": None, "revision_feedback": None, "submitted_at": None, "reviewed_at": None})
    update("project_post_codes", access["id"], {"project_id": project["id"]})
    return {"message": "Project and client added to your workspace", "client": output(client), "project": output(project), "project_post_id": post["id"]}, 201
