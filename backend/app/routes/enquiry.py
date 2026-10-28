from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.orm import joinedload

from app.database import get_session
from app.models.user import User
from app.models.property import Property
from app.models.enquiry import Enquiry
from app.models.enquiry_message import EnquiryMessage
from app.utils.decorators import role_required

enquiry_bp = Blueprint("enquiry", __name__, url_prefix="/enquiries")

def get_current_user(session):
  email = get_jwt_identity()
  return session.query(User).filter_by(email=email).first()

def user_can_access_enquiry(user, enquiry):
    
  property = enquiry.property

  return (
      user.id == enquiry.seeker_id
      or user.id == property.owner_id
  )


def serialize_message(message):
  return {
  "id": message.id,
  "enquiry_id": message.enquiry_id,
  "sender_id": message.sender_id,
  "sender_username": message.sender.username,
  "message": message.message,
  "created_at": message.created_at.isoformat()
  }

def serialize_enquiry(enquiry):
  return {
  "id": enquiry.id,
  "seeker_id": enquiry.seeker_id,
  "property_id": enquiry.property_id,
  "property_title": enquiry.property.title,
  "status": enquiry.status,
  "created_at": enquiry.created_at.isoformat(),
  "updated_at": enquiry.updated_at.isoformat()
  }

# Create an enquiry and its first message

@enquiry_bp.route("", methods=["POST"])
@role_required("seeker")
def create_enquiry():
  data = request.get_json(silent=True) or {}


  property_id = data.get("property_id")
  message_text = data.get("message")

  if not property_id:
      return jsonify({"message": "property_id is required"}), 400

  if not isinstance(message_text, str) or not message_text.strip():
      return jsonify({"message": "Message is required"}), 400

  session = get_session()

  try:
      user = get_current_user(session)

      if user is None:
          return jsonify({"message": "User not found"}), 404

      property = session.query(Property).filter_by(
          id=property_id,
          status="verified"
      ).first()

      if property is None:
          return jsonify({
              "message": "Verified property not found"
          }), 404

      if property.owner_id == user.id:
          return jsonify({
              "message": "You cannot enquire about your own property"
          }), 400

      enquiry = Enquiry(
          seeker_id=user.id,
          property_id=property.id,
          status="open"
      )

      session.add(enquiry)
      session.flush()

      first_message = EnquiryMessage(
          enquiry_id=enquiry.id,
          sender_id=user.id,
          message=message_text.strip()
      )

      session.add(first_message)
      session.commit()

      result = serialize_enquiry(enquiry)
      result["first_message"] = serialize_message(first_message)

      return jsonify({
          "message": "Enquiry created successfully",
          "enquiry": result
      }), 201

  except Exception:
      session.rollback()
      raise

  finally:
      session.close()

# List enquiries sent by the logged-in seeker

@enquiry_bp.route("/sent", methods=["GET"])
@role_required("seeker")
def get_sent_enquiries():
  session = get_session()


  try:
      user = get_current_user(session)

      if user is None:
          return jsonify({"message": "User not found"}), 404

      enquiries = (
          session.query(Enquiry)
          .options(
              joinedload(Enquiry.property)
          )
          .filter_by(seeker_id=user.id)
          .order_by(Enquiry.created_at.desc())
          .all()
      )

      return jsonify({
          "count": len(enquiries),
          "enquiries": [
              serialize_enquiry(enquiry)
              for enquiry in enquiries
          ]
      }), 200

  finally:
      session.close()


# List enquiries received for the logged-in owner's properties

@enquiry_bp.route("/received", methods=["GET"])
@role_required("owner")
def get_received_enquiries():
  session = get_session()
  try:
      user = get_current_user(session)

      if user is None:
          return jsonify({"message": "User not found"}), 404

      enquiries = (
          session.query(Enquiry)
          .join(Property, Enquiry.property_id == Property.id)
          .options(
              joinedload(Enquiry.property)
          )
          .filter(Property.owner_id == user.id)
          .order_by(Enquiry.created_at.desc())
          .all()
      )

      return jsonify({
          "count": len(enquiries),
          "enquiries": [
              serialize_enquiry(enquiry)
              for enquiry in enquiries
          ]
      }), 200

  finally:
      session.close()


# Get the full message thread

@enquiry_bp.route("/<int:enquiry_id>/messages", methods=["GET"])
@role_required("seeker", "owner")
def get_enquiry_messages(enquiry_id):
  session = get_session()

  try:
      user = get_current_user(session)

      if user is None:
          return jsonify({"message": "User not found"}), 404

      enquiry = (
          session.query(Enquiry)
          .options(
              joinedload(Enquiry.property),
              joinedload(Enquiry.messages).joinedload(
                  EnquiryMessage.sender
              )
          )
          .filter_by(id=enquiry_id)
          .first()
      )

      if enquiry is None:
          return jsonify({"message": "Enquiry not found"}), 404

      if not user_can_access_enquiry(user, enquiry):
          return jsonify({
              "message": "You are not authorized to view this conversation"
          }), 403

      return jsonify({
          "enquiry": serialize_enquiry(enquiry),
          "messages": [
              serialize_message(message)
              for message in enquiry.messages
          ]
      }), 200

  finally:
      session.close()

# Send a message or reply

@enquiry_bp.route("/<int:enquiry_id>/messages", methods=["POST"])
@role_required("seeker", "owner")
def send_enquiry_message(enquiry_id):
  data = request.get_json(silent=True) or {}
  message_text = data.get("message")


  if not isinstance(message_text, str) or not message_text.strip():
      return jsonify({"message": "Message is required"}), 400

  session = get_session()

  try:
      user = get_current_user(session)

      if user is None:
          return jsonify({"message": "User not found"}), 404

      enquiry = (
          session.query(Enquiry)
          .options(joinedload(Enquiry.property))
          .filter_by(id=enquiry_id)
          .first()
      )

      if enquiry is None:
          return jsonify({"message": "Enquiry not found"}), 404

      if not user_can_access_enquiry(user, enquiry):
          return jsonify({
              "message": "You are not authorized to reply to this conversation"
          }), 403

      if enquiry.status == "closed":
          return jsonify({
              "message": "This enquiry is closed"
          }), 400

      new_message = EnquiryMessage(
          enquiry_id=enquiry.id,
          sender_id=user.id,
          message=message_text.strip()
      )

      session.add(new_message)
      session.commit()

      result = serialize_message(new_message)

      return jsonify({
          "message": "Message sent successfully",
          "enquiry_message": result
      }), 201

  finally:
      session.close()


# Update enquiry status

@enquiry_bp.route("/<int:enquiry_id>/status", methods=["PATCH"])
@role_required("seeker", "owner")
def update_enquiry_status(enquiry_id):
  data = request.get_json(silent=True) or {}
  status = data.get("status")

  if status not in ["open", "closed"]:
      return jsonify({
          "message": "Status must be 'open' or 'closed'"
      }), 400

  session = get_session()

  try:
      user = get_current_user(session)

      if user is None:
          return jsonify({"message": "User not found"}), 404

      enquiry = (
          session.query(Enquiry)
          .options(joinedload(Enquiry.property))
          .filter_by(id=enquiry_id)
          .first()
      )

      if enquiry is None:
          return jsonify({"message": "Enquiry not found"}), 404

      if not user_can_access_enquiry(user, enquiry):
          return jsonify({
              "message": "You are not authorized to update this enquiry"
          }), 403

      enquiry.status = status
      session.commit()

      return jsonify({
          "message": "Enquiry status updated successfully",
          "enquiry": serialize_enquiry(enquiry)
      }), 200

  finally:
      session.close()

