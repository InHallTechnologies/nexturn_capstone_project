from flask import Blueprint,request,jsonify
from flask_jwt_extended import jwt_required,get_jwt_identity
from datetime import date
from app.database import get_session
from app.models.property import Property
from app.models.user import User
from app.models.inquiry import Inquiry
from datetime import datetime,timezone
from app.utils.decorators import role_required

inquiries_bp = Blueprint("inquiries",__name__,url_prefix="/properties")

@inquiries_bp.route("/<int:property_id>/inquiries",methods = ["POST"])
@role_required("seeker")
def create_inquiry(property_id):
  data = request.get_json()
  session = get_session()
  current_user = get_jwt_identity()
  user = session.query(User).filter_by(email=current_user).first()
  if not user:
    session.close()
    return {
      "error":"User not found"
    },404
  property = session.query(Property).filter_by(id=property_id).first()
  if not property:
    session.close()
    return {
      "error":"Property not found"
    },404
  message = data.get("message")
  if not message:
    session.close()
    return {
      "error":"Message is required"
    },400

  inquiry = Inquiry(
    user_id = user.id,
    property_id=property_id,
    message=message,
    status="pending"
  )
  session.add(inquiry)
  session.commit()
  res = {
    "message":"Inquiry submitted successfully",
    "inquiry":{
      "id": inquiry.id,
      "user_id": inquiry.user_id,
      "property_id": inquiry.property_id,
      "message": inquiry.message,
      "status": inquiry.status
    }
  }
  session.close()
  return jsonify(res),201

@inquiries_bp.route("/inquiries",methods = ["GET"])
@jwt_required()
def get_inquiries():
  current_user = get_jwt_identity()
  session = get_session()
  user = session.query(User).filter_by(email=current_user).first()
  if user is None:
    session.close()
    return jsonify(
      {"error":"User not found"}
    ),404
  inquiries = session.query(Inquiry).filter_by(user_id=user.id).all()

  result = []
  for inquiry in inquiries:
    property = session.query(Property).filter_by(id=inquiry.property_id).first()
    result.append({
      "inquiry_id": inquiry.id,
      "property_id": inquiry.property_id,
      "property_title": property.title if property else None,
      "message": inquiry.message,
      "status": inquiry.status,
      "created_at": inquiry.created_at.isoformat()
    })
  session.close()
  return jsonify(
    {"inquiries":result}
  ),200

@inquiries_bp.route("/<int:property_id>/inquiries/received",methods = ["GET"])
@role_required("owner")
def owner_view_inquiries(property_id):
  current_user = get_jwt_identity()
  session = get_session()
  user = session.query(User).filter_by(email=current_user).first()
  if user is None:
    session.close()
    return {"message":"User not found"},404
  property = session.query(Property).filter_by(id=property_id).first()
  if property is None:
    session.close()
    return jsonify({
      "message":"Property not found"
    }),404
  if property.owner_id != user.id:
    session.close()
    return jsonify({
      "message":"You are not authorized to view these inquiries"
    }),403
  inquiries = session.query(Inquiry).filter_by(property_id=property_id).all()
  result = []
  for inquiry in inquiries:
    result.append({
      "inquiry_id": inquiry.id,
      "user_id": inquiry.user_id,
      "message": inquiry.message,
      "status": inquiry.status,
      "created_at": inquiry.created_at.isoformat()
    })
  session.close()
  return jsonify({
    "inquiries":result
  }),200

@inquiries_bp.route("/inquiries/<int:inquiry_id>", methods=["PATCH"])
@role_required("seeker")
def update_inquiry_status(inquiry_id):
  current_user = get_jwt_identity()
  session = get_session()
  user = session.query(User).filter_by(email=current_user).first()
  if user is None:
    session.close()
    return jsonify({
      "message":"User not found"
    }),404
  inquiry = session.query(Inquiry).filter_by(id=inquiry_id).first()
  if inquiry is None:
    session.close()
    return jsonify({
      "message":"Inquiry not found"
    }),404
  property = session.query(Property).filter_by(id = inquiry.property_id).first()
  if property is None:
    session.close()
    return jsonify({"message":"Property is not found"}),404
  if property.owner_id != user.id:
    session.close()
    return jsonify({
      "message":"You are not authorized to update this inquiry"
    }),403
  data = request.get_json()
  status = data.get("status")
  allowed_statuses = ["Pending", "Responded", "Closed"]
  if status not in allowed_statuses:
    session.close()
    return jsonify({
      "message":"Invalid status"
    }),400
  inquiry.status = status
  session.commit()
  result = {
    "inquiry_id": inquiry.id,
    "property_id": inquiry.property_id,
    "message": inquiry.message,
    "status": inquiry.status
  }
  session.close()
  return jsonify({
    "message":"Inquiry status updated successfully",
    "inquiry":result
  }),200

@inquiries_bp.route("/inquiries/<int:inquiry_id>", methods=["DELETE"])
@role_required("seeker")
def delete_inquiry(inquiry_id):
  current_user = get_jwt_identity()
  session = get_session()
  user = session.query(User).filter_by(email=current_user).first()
  if user is None:
    session.close()
    return jsonify({
      "message":"User not found"
    }),404
  inquiry = session.query(Inquiry).filter_by(id=inquiry_id).first()
  if inquiry is None:
    session.close()
    return jsonify({
      "message": "Inquiry not found"
    }),404
  property = session.query(Property).filter_by(id=inquiry.property_id).first()
  if property is None:
    session.close()
    return jsonify({
      "message": "Property not found"
    }),404
  if property.owner_id != user.id:
    session.close()
    return jsonify({
      "message": "You are not authorized to delete this inquiry"
    }),403
  session.delete(inquiry)
  session.commit()
  session.close()
  return jsonify({
    "message":"Inquiry deleted successfully"
  }),200

