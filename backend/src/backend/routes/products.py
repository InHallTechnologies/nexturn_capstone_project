from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from flask import Blueprint, request
from backend.database import SessionLocal
from backend.models.category import Category
from backend.models.products import Product
from backend.models.stock_movement import StockMovement
from backend.models.user import User
from backend.schemas.products import validate_product
from backend.utils.middleware import role_required, token_required
from backend.routes.common import pagination, request_object, decimal_value, sort_query


products_bp = Blueprint("products", __name__, url_prefix="/api/products")


def serialize_product(product, db, stock=None, include_cost=True):
    if stock is None:
        stock = (
        db.query(func.coalesce(func.sum(StockMovement.quantity), 0))
        .filter(StockMovement.product_id == product.id)
        .scalar()
        )
    result = {
        "id": product.id,
        "sku": product.sku,
        "name": product.name,
        "category_id": product.category_id,
        "unit": product.unit,
        "selling_price": decimal_value(product.selling_price),
        "reorder_level": product.reorder_level,
        "stock": int(stock),
        "is_low_stock": int(stock) <= product.reorder_level,
        "created_at": product.created_at.isoformat(),
        "updated_at": product.updated_at.isoformat(),
    }
    if include_cost:
        result["cost_price"] = decimal_value(product.cost_price)
    return result


def validate_and_check_category(data, db):
    values = validate_product(data)
    if not db.get(Category, values["category_id"]):
        raise LookupError("Category not found")
    return values


@products_bp.get("")
@token_required
@role_required("Owner", "Manager", "Staff")
def list_products(current_user_email):
    args, error = pagination()
    if error:
        return error
    page, per_page = args
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=current_user_email).first()
        stock_totals = (
            db.query(
                StockMovement.product_id.label("product_id"),
                func.sum(StockMovement.quantity).label("stock"),
            )
            .group_by(StockMovement.product_id)
            .subquery()
        )
        query = db.query(
            Product,
            func.coalesce(stock_totals.c.stock, 0).label("stock"),
        ).outerjoin(stock_totals, stock_totals.c.product_id == Product.id)
        search = request.args.get("search", "").strip()
        if search:
            query = query.filter(
                Product.name.ilike(f"%{search}%")
                | Product.sku.ilike(f"%{search}%")
            )
        category = request.args.get("category_id")
        if category:
            try:
                category_id = int(category)
            except ValueError:
                return {"error": "category_id must be an integer"}, 400
            query = query.filter(Product.category_id == category_id)
        low_stock = request.args.get("low_stock", "").lower()
        if low_stock in {"true", "1"}:
            query = query.filter(
                func.coalesce(stock_totals.c.stock, 0) <= Product.reorder_level
            )
        sort_fields = {
            "id": Product.id,
            "sku": Product.sku,
            "name": Product.name,
            "selling_price": Product.selling_price,
            "reorder_level": Product.reorder_level,
            "stock": func.coalesce(stock_totals.c.stock, 0),
        }
        if user.role != "Staff":
            sort_fields["cost_price"] = Product.cost_price
        query, error = sort_query(query, sort_fields)
        if error:
            return error
        total = query.count()
        rows = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return {
            "items": [
                serialize_product(
                    product,
                    db,
                    stock,
                    include_cost=user.role != "Staff",
                )
                for product, stock in rows
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }, 200
    finally:
        db.close()


@products_bp.get("/<int:product_id>")
@token_required
def get_product(current_user_email, product_id):
    db = SessionLocal()
    try:
        product = db.get(Product, product_id)
        if not product:
            return {"error": "Product not found"}, 404
        user = db.query(User).filter_by(email=current_user_email).first()
        return serialize_product(
            product, db, include_cost=user.role != "Staff"
        ), 200
    finally:
        db.close()


@products_bp.post("")
@token_required
@role_required("Owner", "Manager")
def create_product(current_user_email):
    data, error = request_object()
    if error:
        return error
    db = SessionLocal()
    try:
        try:
            values = validate_and_check_category(data, db)
        except LookupError as exc:
            return {"error": str(exc)}, 404
        except ValueError as exc:
            return {"error": str(exc)}, 400
        product = Product(**values)
        db.add(product)
        db.commit()
        db.refresh(product)
        return serialize_product(product, db), 201
    except IntegrityError:
        db.rollback()
        return {"error": "SKU must be unique"}, 409
    finally:
        db.close()


@products_bp.put("/<int:product_id>")
@token_required
@role_required("Owner", "Manager")
def update_product(current_user_email, product_id):
    data, error = request_object()
    if error:
        return error
    db = SessionLocal()
    try:
        product = db.get(Product, product_id)
        if not product:
            return {"error": "Product not found"}, 404
        try:
            values = validate_and_check_category(data, db)
        except LookupError as exc:
            return {"error": str(exc)}, 404
        except ValueError as exc:
            return {"error": str(exc)}, 400
        for key, value in values.items():
            setattr(product, key, value)
        db.commit()
        db.refresh(product)
        return serialize_product(product, db), 200
    except IntegrityError:
        db.rollback()
        return {"error": "SKU must be unique"}, 409
    finally:
        db.close()


@products_bp.delete("/<int:product_id>")
@token_required
@role_required("Owner", "Manager")
def delete_product(current_user_email, product_id):
    db = SessionLocal()
    try:
        product = db.get(Product, product_id)
        if not product:
            return {"error": "Product not found"}, 404
        db.delete(product)
        db.commit()
        return {"message": "Product deleted"}, 200
    except IntegrityError:
        db.rollback()
        return {"error": "Product has transaction history and cannot be deleted"}, 409
    finally:
        db.close()
