from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.database import get_session
from app.models.user import User
from app.models.property import Property
from app.models.amenity import Amenity
from app.models.property_amenity import PropertyAmenity

amenities_bp = Blueprint("amenities", __name__, url_prefix="/properties")


@amenities_bp.route("/amenities", methods=["GET"])
def get_all_amenities():
    session = get_session()

    try:
        amenities = (
            session.query(Amenity)
            .order_by(Amenity.name.asc())
            .all()
        )

        return jsonify({
            "amenities": [
                {
                    "id": amenity.id,
                    "name": amenity.name
                }
                for amenity in amenities
            ]
        }), 200

    except Exception as e:
        session.rollback()
        print("Error fetching amenities:", str(e))

        return jsonify({
            "message": "Failed to fetch amenities"
        }), 500

    finally:
        session.close()


@amenities_bp.route("/<int:property_id>/amenities", methods=["POST"])
@jwt_required()
def add_amenities(property_id):
    current_user = get_jwt_identity()
    session = get_session()
    user = session.query(User).filter_by(email=current_user).first()

    if user is None:
        session.close()
        return jsonify({"message": "User not found"}), 404
    property = session.query(Property).filter_by(id=property_id).first()
    if property is None:
        session.close()
        return jsonify({"message": "Property not found"}), 404
    if property.owner_id != user.id:
        session.close()
        return jsonify({"message": "You are not authorized to modify this property"}), 403
    data = request.get_json()
    amenity_ids = data.get("amenity_ids")
    if not isinstance(amenity_ids, list) or not amenity_ids:
        session.close()
        return jsonify({"message": "amenity_ids must be a non-empty list"}), 400
    if any(type(amenity_id) is not int or amenity_id <= 0 for amenity_id in amenity_ids):
        session.close()
        return jsonify({"message": "All amenity IDs must be positive integers"}), 400
    if len(amenity_ids) != len(set(amenity_ids)):
        session.close()
        return jsonify({"message": "Duplicate amenity IDs are not allowed"}), 400
    amenities = session.query(Amenity).filter(
        Amenity.id.in_(amenity_ids)
    ).all()
    if len(amenities) != len(amenity_ids):
        session.close()
        return jsonify({"message": "One or more amenities do not exist"}), 404
    existing_links = session.query(PropertyAmenity).filter(
        PropertyAmenity.property_id == property_id,
        PropertyAmenity.amenity_id.in_(amenity_ids)
    ).all()
    existing_ids = []
    for link in existing_links:
        existing_ids.append(link.amenity_id)
    added = []
    for amenity_id in amenity_ids:
        if amenity_id not in existing_ids:
            link = PropertyAmenity(
                property_id=property_id,
                amenity_id=amenity_id
            )
            session.add(link)
            added.append(amenity_id)

    session.commit()
    session.close()

    return jsonify({
        "message": "Amenities assigned successfully",
        "property_id": property_id,
        "added_amenity_ids": added
    }), 201


@amenities_bp.route("/<int:property_id>/amenities", methods=["GET"])
def get_property_amenities(property_id):
    session = get_session()
    property = session.query(Property).filter_by(id=property_id).first()
    if property is None:
        session.close()
        return jsonify({"message": "Property not found"}), 404
    links = session.query(PropertyAmenity).filter_by(
        property_id=property_id
    ).all()
    result = []
    for link in links:
        amenity = session.query(Amenity).filter_by(
            id=link.amenity_id
        ).first()
        if amenity:
            result.append({
                "id": amenity.id,
                "name": amenity.name
            })
    session.close()
    return jsonify({
        "property_id": property_id,
        "count": len(result),
        "amenities": result
    }), 200

@amenities_bp.route("/<int:property_id>/amenities", methods=["PUT"])
@jwt_required()
def replace_property_amenities(property_id):
    current_user = get_jwt_identity()
    session = get_session()
    user = session.query(User).filter_by(email=current_user).first()
    if user is None:
        session.close()
        return jsonify({"message": "User not found"}), 404
    property = session.query(Property).filter_by(id=property_id).first()
    if property is None:
        session.close()
        return jsonify({"message": "Property not found"}), 404
    if property.owner_id != user.id:
        session.close()
        return jsonify({"message": "You are not authorized to modify this property"}), 403
    data = request.get_json()
    amenity_ids = data.get("amenity_ids")
    if not isinstance(amenity_ids, list):
        session.close()
        return jsonify({"message": "amenity_ids must be a list"}), 400
    if any(type(amenity_id) is not int or amenity_id <= 0 for amenity_id in amenity_ids):
        session.close()
        return jsonify({"message": "All amenity IDs must be positive integers"}), 400
    if len(amenity_ids) != len(set(amenity_ids)):
        session.close()
        return jsonify({"message": "Duplicate amenity IDs are not allowed"}), 400
    if amenity_ids:
        amenities = session.query(Amenity).filter(
            Amenity.id.in_(amenity_ids)
        ).all()
        if len(amenities) != len(amenity_ids):
            session.close()
            return jsonify({"message": "One or more amenities do not exist"}), 404
    session.query(PropertyAmenity).filter_by(
        property_id=property_id
    ).delete(synchronize_session=False)
    for amenity_id in amenity_ids:
        session.add(PropertyAmenity(
            property_id=property_id,
            amenity_id=amenity_id
        ))
    session.commit()
    session.close()
    return jsonify({
        "message": "Property amenities replaced successfully",
        "property_id": property_id,
        "amenity_ids": amenity_ids
    }), 200

@amenities_bp.route("/<int:property_id>/amenities/<int:amenity_id>",
    methods=["DELETE"])
@jwt_required()
def remove_property_amenity(property_id, amenity_id):
    current_user = get_jwt_identity()
    session = get_session()
    user = session.query(User).filter_by(email=current_user).first()
    if user is None:
        session.close()
        return jsonify({"message": "User not found"}), 404
    property = session.query(Property).filter_by(id=property_id).first()
    if property is None:
        session.close()
        return jsonify({"message": "Property not found"}), 404
    if property.owner_id != user.id:
        session.close()
        return jsonify({"message": "You are not authorized to modify this property"}), 403
    link = session.query(PropertyAmenity).filter_by(
        property_id=property_id,
        amenity_id=amenity_id
    ).first()
    if link is None:
        session.close()
        return jsonify({
            "message": "This amenity is not assigned to the property"
        }), 404
    session.delete(link)
    session.commit()
    session.close()
    return jsonify({
        "message": "Amenity removed from property successfully"
    }), 200

@amenities_bp.route("/amenities", methods=["POST"])
@jwt_required()
def create_amenity():

    current_user = get_jwt_identity()
    session = get_session()

    user = session.query(User).filter_by(email=current_user).first()

    if user is None:
        session.close()
        return jsonify({"message": "User not found"}), 404

    if user.role != "admin":
        session.close()
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json()
    name = data.get("name", "").strip()

    if not name:
        session.close()
        return jsonify({"message": "Amenity name is required"}), 400

    existing_amenity = session.query(Amenity).filter_by(
        name=name
    ).first()

    if existing_amenity:
        session.close()
        return jsonify({"message": "Amenity already exists"}), 409

    amenity = Amenity(name=name)

    session.add(amenity)
    session.commit()

    result = {
        "id": amenity.id,
        "name": amenity.name
    }

    session.close()

    return jsonify({
        "message": "Amenity created successfully",
        "amenity": result
    }), 201