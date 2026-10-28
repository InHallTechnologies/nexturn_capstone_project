from flask import Blueprint,request,jsonify
from flask_jwt_extended import jwt_required,get_jwt_identity
from datetime import date
from app.database import get_session
from app.models.property import Property
from app.models.propertyImage import PropertyImage
from app.models.user import User
from datetime import datetime,timezone
from app.utils.decorators import role_required

propertyimages_bp = Blueprint("propertyimages",__name__,url_prefix="/properties")

@propertyimages_bp.route("/<int:property_id>/images",methods=["POST"])
@role_required("owner")
def create_propertyImage(property_id):
  data = request.get_json()
  session = get_session()
  property = session.query(Property).filter_by(id=property_id).first()
  if property is None:
    session.close()
    return {"message":"Property not found"},404
  current_user = get_jwt_identity()
  user = session.query(User).filter_by(email=current_user).first()
  if user is None or property.owner_id != user.id:
    session.close()
    return {"message":"Not authorized"},403
  image_url = data.get("image_url")
  property_image = PropertyImage(
    property_id=property_id,
    image_url=image_url
  )
  image_id = property_image.id
  session.add(property_image)
  session.commit()
  return jsonify(
    message="Property image added successfully",
    image_id=image_id,
    property_id=property_id,
    image_url=image_url
  ),201

@propertyimages_bp.route("/<int:property_id>/images", methods=["GET"])
def get_property_images(property_id):
  session = get_session()
  property = session.query(Property).filter_by(id=property_id).first()
  if property is None:
    session.close()
    return {
      "message":"Property not found"
    },404
  images = session.query(PropertyImage).filter_by(property_id=property_id).all()
  images_list = []
  for image in images:
    images_list.append({
      "id": image.id,
      "property_id": image.property_id,
      "image_url": image.image_url,
      "created_at": image.created_at.isoformat()
    })
  session.close()
  return jsonify(images_list),200

@propertyimages_bp.route("/<int:property_id>/images/<int:image_id>", methods=["DELETE"])
@role_required("owner")
def delete_property_image(property_id,image_id):
  session = get_session()
  current_user = get_jwt_identity()
  property = session.query(Property).filter_by(id=property_id).first()
  if property is None:
    session.close()
    return {
      "message":"Property not found"
    },404
  user = session.query(User).filter_by(email=current_user).first()
  if user is None or property.owner_id != user.id:
    session.close()
    return {
      "message":"Not authorized to delete this propertyImage"
    },403
  image = session.query(PropertyImage).filter_by(id=image_id,property_id=property_id).first()
  if image is None:
    session.close()
    return {"message":"image not found"},404
  session.delete(image)
  session.commit()
  session.close()
  return {
    "message":"PropertyImage successfully deleted"
  },200


