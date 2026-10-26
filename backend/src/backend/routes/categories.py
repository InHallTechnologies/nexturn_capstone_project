from sqlalchemy.exc import IntegrityError

from flask import Blueprint, request
from backend.database import SessionLocal
from backend.models.category import Category
from backend.schemas.category import validate_category
from backend.utils.middleware import role_required, token_required
from backend.routes.common import pagination, paginated, request_object, sort_query


categories_bp = Blueprint("categories", __name__, url_prefix="/api/categories")


def serialize_category(category):
    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "created_at": category.created_at.isoformat(),
        "updated_at": category.updated_at.isoformat(),
    }


@categories_bp.get("")
@token_required
@role_required("Owner", "Manager")
def list_categories(current_user_email):
    args, error = pagination()
    if error:
        return error
    page, per_page = args
    query = SessionLocal().query(Category)
    search = request.args.get("search", "").strip()
    if search:
        query = query.filter(Category.name.ilike(f"%{search}%"))
    query, error = sort_query(
        query,
        {"id": Category.id, "name": Category.name, "created_at": Category.created_at},
    )
    if error:
        return error
    try:
        return paginated(query, page, per_page, serialize_category), 200
    finally:
        query.session.close()


@categories_bp.get("/<int:category_id>")
@token_required
@role_required("Owner", "Manager")
def get_category(current_user_email, category_id):
    db = SessionLocal()
    try:
        category = db.get(Category, category_id)
        if not category:
            return {"error": "Category not found"}, 404
        return serialize_category(category), 200
    finally:
        db.close()


@categories_bp.post("")
@token_required
@role_required("Owner", "Manager")
def create_category(current_user_email):
    data, error = request_object()
    if error:
        return error
    try:
        values = validate_category(data)
    except ValueError as exc:
        return {"error": str(exc)}, 400

    db = SessionLocal()
    try:
        category = Category(**values)
        db.add(category)
        db.commit()
        db.refresh(category)
        return serialize_category(category), 201
    except IntegrityError:
        db.rollback()
        return {"error": "A category with this name already exists"}, 409
    finally:
        db.close()


@categories_bp.put("/<int:category_id>")
@token_required
@role_required("Owner", "Manager")
def update_category(current_user_email, category_id):
    data, error = request_object()
    if error:
        return error
    try:
        values = validate_category(data)
    except ValueError as exc:
        return {"error": str(exc)}, 400

    db = SessionLocal()
    try:
        category = db.get(Category, category_id)
        if not category:
            return {"error": "Category not found"}, 404
        for key, value in values.items():
            setattr(category, key, value)
        db.commit()
        db.refresh(category)
        return serialize_category(category), 200
    except IntegrityError:
        db.rollback()
        return {"error": "A category with this name already exists"}, 409
    finally:
        db.close()


@categories_bp.delete("/<int:category_id>")
@token_required
@role_required("Owner", "Manager")
def delete_category(current_user_email, category_id):
    db = SessionLocal()
    try:
        category = db.get(Category, category_id)
        if not category:
            return {"error": "Category not found"}, 404
        db.delete(category)
        db.commit()
        return {"message": "Category deleted"}, 200
    except IntegrityError:
        db.rollback()
        return {"error": "Category is used by products and cannot be deleted"}, 409
    finally:
        db.close()
