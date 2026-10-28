import math
from datetime import date, datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import or_

from app.database import get_session
from app.models.property import Property
from app.models.propertyImage import PropertyImage
from app.models.user import User
from app.utils.decorators import role_required

properties_bp = Blueprint("properties", __name__, url_prefix="/properties")

SORT_COLUMN_MAP = {
    "created_at": Property.created_at,
    "rent": Property.rent,
    "title": Property.title,
    "area": Property.area,
    "bhk": Property.bhk,
    "id": Property.id,
}


def serialize_property(prop, primary_image=None):
    return {
        "id": prop.id,
        "owner_id": prop.owner_id,
        "title": prop.title,
        "type": prop.type,
        "city": prop.city,
        "locality": prop.locality,
        "rent": float(prop.rent) if prop.rent is not None else None,
        "deposit": float(prop.deposit) if prop.deposit is not None else None,
        "bhk": prop.bhk,
        "area": float(prop.area) if prop.area is not None else None,
        "furnishing": prop.furnishing,
        "available_from": (
            prop.available_from.isoformat() if prop.available_from else None
        ),
        "status": prop.status,
        "view_count": prop.view_count,
        "created_at": (
            prop.created_at.isoformat() if prop.created_at else None
        ),
        "updated_at": (
            prop.updated_at.isoformat() if prop.updated_at else None
        ),
        "rejection_reason": prop.rejection_reason,
        "primary_image": primary_image,
    }


def get_primary_images_map(session, property_ids):
    if not property_ids:
        return {}
    images = (
        session.query(PropertyImage)
        .filter(PropertyImage.property_id.in_(property_ids))
        .order_by(PropertyImage.property_id, PropertyImage.id.asc())
        .all()
    )
    img_map = {}
    for img in images:
        if img.property_id not in img_map:
            img_map[img.property_id] = img.image_url
    return img_map


def parse_pagination_and_sorting(args, default_sort="created_at", default_order="desc"):
    page_str = args.get("page", "1")
    try:
        page = int(page_str)
        if page < 1:
            return None, None, None, None, ("Invalid page parameter: must be >= 1", 400)
    except (ValueError, TypeError):
        return None, None, None, None, ("Invalid page parameter: must be an integer", 400)

    per_page_str = args.get("per_page", "12")
    try:
        per_page = int(per_page_str)
        if per_page < 1 or per_page > 100:
            return None, None, None, None, ("Invalid per_page parameter: must be between 1 and 100", 400)
    except (ValueError, TypeError):
        return None, None, None, None, ("Invalid per_page parameter: must be an integer", 400)

    sort_by = args.get("sort_by", default_sort).lower().strip()
    if sort_by not in SORT_COLUMN_MAP:
        return None, None, None, None, (
            f"Invalid sort_by parameter: allowed options are {list(SORT_COLUMN_MAP.keys())}",
            400,
        )

    order = args.get("order", default_order).lower().strip()
    if order not in ["asc", "desc"]:
        return None, None, None, None, ("Invalid order parameter: allowed options are 'asc' or 'desc'", 400)

    col = SORT_COLUMN_MAP[sort_by]
    primary_sort = col.asc() if order == "asc" else col.desc()
    secondary_sort = Property.id.asc() if order == "asc" else Property.id.desc()

    return page, per_page, primary_sort, secondary_sort, None


@properties_bp.route("", methods=["POST"])
@role_required("owner")
def create_property():
    data = request.get_json()
    curr_user_identity = get_jwt_identity()
    session = get_session()
    try:
        user = session.query(User).filter_by(email=curr_user_identity).first()
        if user is None:
            return jsonify({"message": "User not found"}), 404

        property = Property(
            owner_id=user.id,
            title=data["title"],
            type=data["type"],
            city=data["city"],
            locality=data["locality"],
            rent=data["rent"],
            deposit=data["deposit"],
            bhk=data.get("bhk"),
            area=data["area"],
            furnishing=data["furnishing"],
            available_from=data["available_from"],
        )
        session.add(property)
        session.commit()
        property_id = property.id
        return jsonify(
            message="Property created successfully",
            property_id=property_id,
        ), 201
    finally:
        session.close()


@properties_bp.route("", methods=["GET"], strict_slashes=False)
@properties_bp.route("/", methods=["GET"], strict_slashes=False)
@role_required("owner")
def get_owner_properties():
    page, per_page, primary_sort, secondary_sort, err = parse_pagination_and_sorting(
        request.args, default_sort="created_at", default_order="desc"
    )
    if err:
        return jsonify({"message": err[0]}), err[1]

    session = get_session()
    try:
        current_user = get_jwt_identity()
        user = session.query(User).filter_by(email=current_user).first()
        if user is None:
            return jsonify({"message": "User not found"}), 404

        # Statistics representing all owner properties
        total_count = session.query(Property).filter_by(owner_id=user.id).count()
        pending_count = session.query(Property).filter_by(owner_id=user.id, status="pending").count()
        verified_count = session.query(Property).filter_by(owner_id=user.id, status="verified").count()
        rejected_count = session.query(Property).filter_by(owner_id=user.id, status="rejected").count()

        stats = {
            "total": total_count,
            "pending": pending_count,
            "verified": verified_count,
            "rejected": rejected_count,
        }

        # Query owner's properties with optional filters
        query = session.query(Property).filter_by(owner_id=user.id)

        status_filter = request.args.get("status", "").strip()
        if status_filter:
            query = query.filter_by(status=status_filter)

        search = request.args.get("search", "").strip()
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Property.title.ilike(search_pattern),
                    Property.city.ilike(search_pattern),
                    Property.locality.ilike(search_pattern),
                )
            )

        total_items = query.count()
        total_pages = math.ceil(total_items / per_page) if total_items > 0 else 1

        if total_items == 0 or page > total_pages:
            user_properties = []
        else:
            user_properties = (
                query.order_by(primary_sort, secondary_sort)
                .limit(per_page)
                .offset((page - 1) * per_page)
                .all()
            )

        prop_ids = [p.id for p in user_properties]
        images_map = get_primary_images_map(session, prop_ids)

        properties_list = [
            serialize_property(p, images_map.get(p.id)) for p in user_properties
        ]

        return jsonify({
            "properties": properties_list,
            "stats": stats,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_items": total_items,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1,
            },
            "count": total_items,
        }), 200
    finally:
        session.close()


@properties_bp.route("/<int:property_id>", methods=["GET"])
def get_property_by_id(property_id):
    session = get_session()
    try:
        property = session.query(Property).filter_by(id=property_id).first()
        if property is None:
            return jsonify(message="Property not found"), 404

        property.view_count += 1
        session.commit()

        images_map = get_primary_images_map(session, [property.id])
        result = serialize_property(property, images_map.get(property.id))
        return jsonify(result), 200
    finally:
        session.close()


@properties_bp.route("/<int:property_id>", methods=["PUT"])
@role_required("owner")
def update_property(property_id):
    data = request.get_json()
    session = get_session()
    try:
        current_user = get_jwt_identity()
        property = session.query(Property).filter_by(id=property_id).first()
        if property is None:
            return {"message": "Property not found"}, 404

        user = session.query(User).filter_by(email=current_user).first()
        if user is None or property.owner_id != user.id:
            return {"message": "Not authorized"}, 403

        if "title" in data:
            property.title = data["title"]
        if "type" in data:
            property.type = data["type"]
        if "city" in data:
            property.city = data["city"]
        if "locality" in data:
            property.locality = data["locality"]
        if "rent" in data:
            property.rent = data["rent"]
        if "deposit" in data:
            property.deposit = data["deposit"]
        if "bhk" in data:
            property.bhk = data["bhk"]
        if "area" in data:
            property.area = data["area"]
        if "furnishing" in data:
            property.furnishing = data["furnishing"]
        if "available_from" in data:
            property.available_from = date.fromisoformat(data["available_from"])
        property.updated_at = datetime.now(timezone.utc)
        session.commit()
        return {"message": "Property updated successfully"}, 200
    finally:
        session.close()


@properties_bp.route("/<int:property_id>", methods=["DELETE"])
@role_required("owner")
def delete_property(property_id):
    session = get_session()
    try:
        current_user = get_jwt_identity()
        property = session.query(Property).filter_by(id=property_id).first()
        if property is None:
            return {"message": "Property not found"}, 404

        user = session.query(User).filter_by(email=current_user).first()
        if user is None or property.owner_id != user.id:
            return {"message": "Not Authorized to delete this property"}, 403

        session.delete(property)
        session.commit()
        return {"message": "Property deleted successfully"}, 200
    finally:
        session.close()


@properties_bp.route("/filter", methods=["GET"])
@role_required("owner", "seeker", "admin")
def get_filtered_properties():
    page, per_page, primary_sort, secondary_sort, err = parse_pagination_and_sorting(
        request.args, default_sort="created_at", default_order="desc"
    )
    if err:
        return jsonify({"message": err[0]}), err[1]

    session = get_session()
    try:
        query = session.query(Property).filter(Property.status == "verified")

        city = request.args.get("city")
        if city:
            query = query.filter(Property.city.ilike(f"%{city}%"))

        property_type = request.args.get("type")
        if property_type:
            query = query.filter(Property.type.ilike(property_type))

        min_rent = request.args.get("min_rent")
        if min_rent:
            try:
                query = query.filter(Property.rent >= float(min_rent))
            except ValueError:
                return jsonify({"message": "Invalid min_rent"}), 400

        max_rent = request.args.get("max_rent")
        if max_rent:
            try:
                query = query.filter(Property.rent <= float(max_rent))
            except ValueError:
                return jsonify({"message": "Invalid max_rent"}), 400

        bhk = request.args.get("bhk")
        if bhk:
            try:
                query = query.filter(Property.bhk == int(bhk))
            except ValueError:
                return jsonify({"message": "Invalid bhk"}), 400

        total_items = query.count()
        total_pages = math.ceil(total_items / per_page) if total_items > 0 else 1

        if total_items == 0 or page > total_pages:
            query_properties = []
        else:
            query_properties = (
                query.order_by(primary_sort, secondary_sort)
                .limit(per_page)
                .offset((page - 1) * per_page)
                .all()
            )

        prop_ids = [p.id for p in query_properties]
        images_map = get_primary_images_map(session, prop_ids)

        filtered_properties = [
            serialize_property(p, images_map.get(p.id)) for p in query_properties
        ]

        return jsonify({
            "properties": filtered_properties,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_items": total_items,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1,
            },
            "count": total_items,
        }), 200
    finally:
        session.close()


@properties_bp.route("/public", methods=["GET"], strict_slashes=False)
def get_public_properties():
    page, per_page, primary_sort, secondary_sort, err = parse_pagination_and_sorting(
        request.args, default_sort="created_at", default_order="desc"
    )
    if err:
        return jsonify({"message": err[0]}), err[1]

    session = get_session()
    try:
        # Strictly public verified properties only
        query = session.query(Property).filter(Property.status == "verified")

        # Search across title, city, locality
        search = request.args.get("search", "").strip()
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Property.title.ilike(search_pattern),
                    Property.city.ilike(search_pattern),
                    Property.locality.ilike(search_pattern),
                )
            )

        # Filters
        city = request.args.get("city", "").strip()
        if city:
            query = query.filter(Property.city.ilike(f"%{city}%"))

        prop_type = request.args.get("type", "").strip()
        if prop_type:
            query = query.filter(Property.type.ilike(prop_type))

        min_rent = request.args.get("min_rent")
        if min_rent is not None and min_rent != "":
            try:
                query = query.filter(Property.rent >= float(min_rent))
            except ValueError:
                return jsonify({"message": "Invalid min_rent: must be a number"}), 400

        max_rent = request.args.get("max_rent")
        if max_rent is not None and max_rent != "":
            try:
                query = query.filter(Property.rent <= float(max_rent))
            except ValueError:
                return jsonify({"message": "Invalid max_rent: must be a number"}), 400

        bhk = request.args.get("bhk")
        if bhk is not None and bhk != "":
            try:
                query = query.filter(Property.bhk == int(bhk))
            except ValueError:
                return jsonify({"message": "Invalid bhk: must be an integer"}), 400

        furnishing = request.args.get("furnishing", "").strip()
        if furnishing:
            query = query.filter(Property.furnishing.ilike(furnishing))

        # Total count before pagination
        total_items = query.count()
        total_pages = math.ceil(total_items / per_page) if total_items > 0 else 1

        if total_items == 0 or page > total_pages:
            properties = []
        else:
            properties = (
                query.order_by(primary_sort, secondary_sort)
                .limit(per_page)
                .offset((page - 1) * per_page)
                .all()
            )

        prop_ids = [p.id for p in properties]
        images_map = get_primary_images_map(session, prop_ids)

        result = [serialize_property(p, images_map.get(p.id)) for p in properties]

        return jsonify({
            "properties": result,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_items": total_items,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1,
            },
            "count": total_items,
        }), 200
    finally:
        session.close()