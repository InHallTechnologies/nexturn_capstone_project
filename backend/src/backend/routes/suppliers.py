from sqlalchemy.exc import IntegrityError

from flask import Blueprint, request
from backend.database import SessionLocal
from backend.models.purchase_orders import PurchaseOrder
from backend.models.supplier import Supplier
from backend.models.user import User
from backend.schemas.supplier import validate_supplier
from backend.utils.middleware import role_required, token_required
from backend.routes.common import pagination, paginated, request_object, sort_query


suppliers_bp = Blueprint("suppliers", __name__, url_prefix="/api/suppliers")


def serialize_supplier(supplier):
    return {
        "id": supplier.id,
        "name": supplier.name,
        "contact": supplier.contact,
        "email": supplier.email,
        "address": supplier.address,
        "payment_terms": supplier.payment_terms,
        "created_at": supplier.created_at.isoformat(),
        "updated_at": supplier.updated_at.isoformat(),
    }


def serialize_order(order):
    return {
        "id": order.id,
        "supplier_id": order.supplier_id,
        "status": order.status,
        "expected_date": order.expected_date.isoformat() if order.expected_date else None,
        "created_by": order.created_by,
        "created_at": order.created_at.isoformat(),
    }


@suppliers_bp.get("")
@token_required
@role_required("Owner", "Manager")
def list_suppliers(current_user_email):
    args, error = pagination()
    if error:
        return error
    page, per_page = args
    db = SessionLocal()
    try:
        query = db.query(Supplier)
        search = request.args.get("search", "").strip()
        if search:
            query = query.filter(Supplier.name.ilike(f"%{search}%"))
        query, error = sort_query(
            query,
            {"id": Supplier.id, "name": Supplier.name, "created_at": Supplier.created_at},
        )
        if error:
            return error
        return paginated(query, page, per_page, serialize_supplier), 200
    finally:
        db.close()


@suppliers_bp.get("/<int:supplier_id>")
@token_required
@role_required("Owner", "Manager")
def get_supplier(current_user_email, supplier_id):
    db = SessionLocal()
    try:
        supplier = db.get(Supplier, supplier_id)
        if not supplier:
            return {"error": "Supplier not found"}, 404
        return serialize_supplier(supplier), 200
    finally:
        db.close()


@suppliers_bp.get("/<int:supplier_id>/purchase-orders")
@token_required
@role_required("Owner", "Manager")
def supplier_purchase_history(current_user_email, supplier_id):
    args, error = pagination()
    if error:
        return error
    page, per_page = args
    db = SessionLocal()
    try:
        if not db.get(Supplier, supplier_id):
            return {"error": "Supplier not found"}, 404
        query = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == supplier_id)
        user = db.query(User).filter_by(email=current_user_email).first()
        if user.role != "Owner":
            query = query.filter(PurchaseOrder.created_by == user.id)
        query, error = sort_query(
            query,
            {
                "id": PurchaseOrder.id,
                "status": PurchaseOrder.status,
                "expected_date": PurchaseOrder.expected_date,
                "created_at": PurchaseOrder.created_at,
            },
        )
        if error:
            return error
        return paginated(query, page, per_page, serialize_order), 200
    finally:
        db.close()


@suppliers_bp.post("")
@token_required
@role_required("Owner", "Manager")
def create_supplier(current_user_email):
    data, error = request_object()
    if error:
        return error
    try:
        values = validate_supplier(data)
    except ValueError as exc:
        return {"error": str(exc)}, 400
    db = SessionLocal()
    try:
        supplier = Supplier(**values)
        db.add(supplier)
        db.commit()
        db.refresh(supplier)
        return serialize_supplier(supplier), 201
    finally:
        db.close()


@suppliers_bp.put("/<int:supplier_id>")
@token_required
@role_required("Owner", "Manager")
def update_supplier(current_user_email, supplier_id):
    data, error = request_object()
    if error:
        return error
    try:
        values = validate_supplier(data)
    except ValueError as exc:
        return {"error": str(exc)}, 400
    db = SessionLocal()
    try:
        supplier = db.get(Supplier, supplier_id)
        if not supplier:
            return {"error": "Supplier not found"}, 404
        for key, value in values.items():
            setattr(supplier, key, value)
        db.commit()
        db.refresh(supplier)
        return serialize_supplier(supplier), 200
    finally:
        db.close()


@suppliers_bp.delete("/<int:supplier_id>")
@token_required
@role_required("Owner", "Manager")
def delete_supplier(current_user_email, supplier_id):
    db = SessionLocal()
    try:
        supplier = db.get(Supplier, supplier_id)
        if not supplier:
            return {"error": "Supplier not found"}, 404
        db.delete(supplier)
        db.commit()
        return {"message": "Supplier deleted"}, 200
    except IntegrityError:
        db.rollback()
        return {"error": "Supplier has purchase history and cannot be deleted"}, 409
    finally:
        db.close()
