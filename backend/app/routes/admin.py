from flask import Blueprint,jsonify,request
from flask_jwt_extended import jwt_required,get_jwt_identity
from app.database import get_session
from app.models.user import User
from app.models.property import Property
from app.utils.decorators import role_required
from app.models.propertyImage import PropertyImage
from app.models.amenity import Amenity
from app.models.property_amenity import PropertyAmenity

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")
@admin_bp.route("/properties/pending", methods=["GET"])
@role_required("admin")
def get_pending_properties():
    current_user = get_jwt_identity()
    session = get_session()
    try:
        user = session.query(User).filter_by(email=current_user).first()
        if user is None:
            return jsonify({"message": "User not found"}), 404

        properties = (
            session.query(Property)
            .filter_by(status="pending")
            .order_by(Property.created_at.desc(), Property.id.desc())
            .all()
        )
        result = []
        for property in properties:
            result.append({
                "id": property.id,
                "owner_id": property.owner_id,
                "title": property.title,
                "type": property.type,
                "city": property.city,
                "locality": property.locality,
                "rent": float(property.rent) if property.rent is not None else None,
                "deposit": float(property.deposit) if property.deposit is not None else None,
                "bhk": property.bhk,
                "area": float(property.area) if property.area is not None else None,
                "furnishing": property.furnishing,
                "available_from": property.available_from.isoformat() if property.available_from else None,
                "status": property.status,
                "created_at": property.created_at.isoformat() if property.created_at else None,
            })
        return jsonify({
            "count": len(result),
            "properties": result,
        }), 200
    finally:
        session.close()

@admin_bp.route("/properties/<int:property_id>/verify",methods = ["PATCH"])
@role_required("admin")
def verify_property(property_id):
  current_user = get_jwt_identity()
  session = get_session()
  user = session.query(User).filter_by(email=current_user).first()
  if user is None:
    session.close()
    return jsonify({
      "message": "User not found"
    }),404
  if user.role != "admin":
    session.close()
    return jsonify({
      "message": "Admin access required"
    }),403
  property = session.query(Property).filter_by(id=property_id).first()
  if property.status != "pending":
    session.close()
    return jsonify({
      "message": "Only pending properties can be verified"
    }),400
  property.status = "verified"
  session.commit()
  result = {
    "id": property.id,
    "title": property.title,
    "status": property.status
  }
  session.close()
  return jsonify({
    "message": "Property verified successfully",
    "property": result
  }),200

@admin_bp.route("/properties/<int:property_id>/reject", methods=["PATCH"])
@role_required("admin")
def reject_property(property_id):
  current_user = get_jwt_identity()
  session = get_session()
  user = session.query(User).filter_by(email=current_user).first()
  if user is None:
    session.close()
    return jsonify({
      "message": "User not found"
    }),404

  if user.role != "admin":
    session.close()
    return jsonify({
      "message": "Admin access required"
    }),403
  property = session.query(Property).filter_by(id=property_id).first()
  if property is None:
    session.close()
    return jsonify({
      "message": "Property not found"
    }),404
  if property.status != "pending":
    session.close()
    return jsonify({
      "message": "Only pending properties can be rejected"
    }),400
  data = request.get_json()
  rejection_reason = data.get("rejection_reason", "").strip()
  if not rejection_reason:
    session.close()
    return jsonify({
      "message": "Rejection reason is required"
    }),400

  property.status = "rejected"
  property.rejection_reason = rejection_reason
  session.commit()
  result = {
    "id": property.id,
    "title": property.title,
    "status": property.status
  }
  session.close()
  return jsonify({
    "message": "Property rejected successfully",
    "property": result
  }),200

@admin_bp.route("/properties/<int:property_id>/review", methods=["GET"])
@role_required("admin")
def review_property(property_id):
    session = get_session()

    try:
        current_user = get_jwt_identity()

        admin = session.query(User).filter_by(
            email=current_user
        ).first()

        if admin is None:
            return jsonify({"message": "Admin not found"}), 404

        property = session.query(Property).filter_by(
            id=property_id
        ).first()

        if property is None:
            return jsonify({"message": "Property not found"}), 404

        owner = session.query(User).filter_by(
            id=property.owner_id
        ).first()

        # Fetch every image belonging to the property.
        images = session.query(PropertyImage).filter_by(
            property_id=property_id
        ).all()

        # Fetch the property's assigned amenities.
        property_amenities = session.query(
            PropertyAmenity
        ).filter_by(property_id=property_id).all()

        amenity_ids = [
            item.amenity_id for item in property_amenities
        ]

        amenities = []

        if amenity_ids:
            amenities = session.query(Amenity).filter(
                Amenity.id.in_(amenity_ids)
            ).all()

        property_data = {
            "id": property.id,
            "owner_id": property.owner_id,
            "title": property.title,
            "type": property.type,
            "city": property.city,
            "locality": property.locality,
            "rent": float(property.rent) if property.rent is not None else None,
            "deposit": float(property.deposit) if property.deposit is not None else None,
            "bhk": property.bhk,
            "area": float(property.area) if property.area is not None else None,
            "furnishing": property.furnishing,
            "available_from": (
                property.available_from.isoformat()
                if property.available_from else None
            ),
            "status": property.status,
            "view_count": property.view_count,
            "rejection_reason": property.rejection_reason,
            "created_at": (
                property.created_at.isoformat()
                if property.created_at else None
            ),
            "updated_at": (
                property.updated_at.isoformat()
                if property.updated_at else None
            )
        }

        owner_data = None

        if owner:
            owner_data = {
                "id": owner.id,
                "username": owner.username,
                "email": owner.email,
                "phone": owner.phone,
                "role": owner.role,
                "verified": owner.verified
            }

        image_data = [
            {
                "id": image.id,
                "image_url": image.image_url,
                "created_at": (
                    image.created_at.isoformat()
                    if image.created_at else None
                )
            }
            for image in images
        ]

        amenity_data = [
            {
                "id": amenity.id,
                "name": amenity.name
            }
            for amenity in amenities
        ]

        return jsonify({
            "property": property_data,
            "owner": owner_data,
            "images": image_data,
            "amenities": amenity_data
        }), 200

    finally:
        session.close()


    