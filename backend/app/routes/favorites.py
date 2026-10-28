from flask import Blueprint,request,jsonify
from flask_jwt_extended import jwt_required,get_jwt_identity
from datetime import date

from app.database import get_session
from app.models.property import Property
from app.models.user import User
from app.models.favorite import Favorite
from datetime import datetime,timezone
from app.utils.decorators import role_required

favorites_bp = Blueprint("favorites",__name__,url_prefix="/favorites")

@favorites_bp.route("/<int:property_id>",methods=["POST"])
@role_required("seeker")
def add_favorites(property_id):
  current_user = get_jwt_identity()
  session = get_session()
  user = session.query(User).filter_by(email=current_user).first()
  if user is None:
    session.close()
    return jsonify(message="User not found"), 404
  user_id=user.id
  property = session.query(Property).filter_by(id=property_id).first()
  if property is None:
    session.close()
    return jsonify(message="Property not found"), 404
  existing_favorite = session.query(Favorite).filter_by(user_id=user.id,property_id = property_id).first()
  if existing_favorite:
    session.close()
    return jsonify(message="Property already added to favorites"), 409
  favorite = Favorite(
    user_id = user.id,
    property_id=property_id
  )
  session.add(favorite)
  session.commit()
  favorite_id = favorite.id
  session.close()
  return jsonify(
   message="Property added to favorites successfully",
   favorite_id=favorite_id,
   user_id=user_id,
   property_id=property_id 
  ),201

@favorites_bp.route("/",methods=["GET"])
@jwt_required()
def get_favorites():
  current_user = get_jwt_identity()
  session = get_session()
  user = session.query(User).filter_by(email=current_user).first()
  if user is None:
      session.close()
      return jsonify(message="User not found"), 404
  favorites = session.query(Favorite).filter_by(user_id=user.id).all()
  all_favorites_items = []
  for fav in favorites:
    property = session.query(Property).filter_by(
      id=fav.property_id
    ).first()
    if property:
      all_favorites_items.append({
        "favorite_id": fav.id,
        "property_id": property.id,
        "title": property.title,
        "city": property.city,
        "locality": property.locality,
        "rent": float(property.rent)
      })
  session.close()
  return jsonify(all_favorites_items),200

@favorites_bp.route("/<int:property_id>",methods=["DELETE"])
@role_required("seeker")
def delete_property(property_id):
  current_user = get_jwt_identity()
  session = get_session()
  user = session.query(User).filter_by(email=current_user).first()
  if user is None:
    session.close()
    return jsonify(message="User not found"),404
  favorite = session.query(Favorite).filter_by(
    user_id = user.id,
    property_id = property_id
  ).first()
  if favorite is None:
    session.close()
    return jsonify(message="Favorite not found"), 404
  session.delete(favorite)
  session.commit()
  session.close()
  return jsonify(
    message="Property removed from favorites successfully"
  ),200


