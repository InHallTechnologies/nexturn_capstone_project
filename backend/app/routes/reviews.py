from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import get_session
from app.models.user import User
from app.models.property import Property
from app.models.review import Review

reviews_bp = Blueprint("reviews", __name__)
@reviews_bp.route("/properties/<int:property_id>/reviews",methods=["POST"])
@jwt_required()
def create_review(property_id):
    current_user = get_jwt_identity()
    session = get_session()
    user = session.query(User).filter_by(
        email=current_user
    ).first()
    if user is None:
        session.close()
        return jsonify({"message": "User not found"}), 404
    property = session.query(Property).filter_by(
        id=property_id
    ).first()
    if property is None:
        session.close()
        return jsonify({"message": "Property not found"}), 404
    if property.status != "verified":
        session.close()
        return jsonify({
            "message": "Reviews are allowed only for verified properties"
        }), 400
    data = request.get_json()
    if not isinstance(data, dict):
        session.close()
        return jsonify({"message": "A JSON object is required"}), 400
    rating = data.get("rating")
    comment = data.get("comment")
    if type(rating) is not int or rating < 1 or rating > 5:
        session.close()
        return jsonify({
            "message": "Rating must be an integer between 1 and 5"
        }), 400
    if comment is not None and not isinstance(comment, str):
        session.close()
        return jsonify({
            "message": "Comment must be a string"
        }), 400
    if comment is not None and len(comment) > 1000:
        session.close()
        return jsonify({
            "message": "Comment cannot exceed 1000 characters"
        }), 400
    existing_review = session.query(Review).filter_by(
        user_id=user.id,
        property_id=property_id
    ).first()
    if existing_review:
        session.close()
        return jsonify({
            "message": "You have already reviewed this property"
        }), 409
    review = Review(
        user_id=user.id,
        property_id=property_id,
        rating=rating,
        comment=comment.strip() if comment else None
    )
    session.add(review)
    session.commit()
    result = {
        "id": review.id,
        "user_id": review.user_id,
        "property_id": review.property_id,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at.isoformat()
    }
    session.close()
    return jsonify({
        "message": "Review submitted successfully",
        "review": result
    }), 201


@reviews_bp.route("/properties/<int:property_id>/reviews",methods=["GET"])
def get_property_reviews(property_id):
    session = get_session()
    property = session.query(Property).filter_by(id=property_id).first()
    if property is None:
        session.close()
        return jsonify({"message": "Property not found"}), 404
    reviews = session.query(Review).filter_by(property_id=property_id).order_by(Review.created_at.desc()).all()
    result = []
    for review in reviews:
        user = session.query(User).filter_by(
            id=review.user_id
        ).first()
        result.append({
            "id": review.id,
            "user_id": review.user_id,
            "username": user.username if user else None,
            "property_id": review.property_id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at.isoformat() if review.created_at else None
        })
    session.close()
    return jsonify({
        "property_id": property_id,
        "count": len(result),
        "reviews": result
    }), 200

@reviews_bp.route("/reviews/<int:review_id>", methods=["PATCH"])
@jwt_required()
def update_review(review_id):
    current_user = get_jwt_identity()
    session = get_session()
    user = session.query(User).filter_by(email=current_user).first()
    if user is None:
        session.close()
        return jsonify({"message": "User not found"}), 404
    review = session.query(Review).filter_by(id=review_id).first()
    if review is None:
        session.close()
        return jsonify({"message": "Review not found"}), 404
    if review.user_id != user.id:
        session.close()
        return jsonify({
            "message": "You are not authorized to update this review"
        }), 403
    data = request.get_json()
    if not isinstance(data, dict):
        session.close()
        return jsonify({"message": "A JSON object is required"}), 400
    if "rating" not in data and "comment" not in data:
        session.close()
        return jsonify({
            "message": "Provide rating or comment to update"
        }), 400
    if "rating" in data:
        rating = data["rating"]
        if type(rating) is not int or rating < 1 or rating > 5:
            session.close()
            return jsonify({
                "message": "Rating must be an integer between 1 and 5"
            }), 400
        review.rating = rating
    if "comment" in data:
        comment = data["comment"]
        if comment is not None and not isinstance(comment, str):
            session.close()
            return jsonify({
                "message": "Comment must be a string or null"
            }), 400
        if comment is not None and len(comment) > 1000:
            session.close()
            return jsonify({
                "message": "Comment cannot exceed 1000 characters"
            }), 400
        review.comment = comment.strip() if comment else None
    session.commit()
    result = {
        "id": review.id,
        "user_id": review.user_id,
        "property_id": review.property_id,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at.isoformat() if review.created_at else None
    }
    session.close()
    return jsonify({
        "message": "Review updated successfully",
        "review": result
    }), 200


@reviews_bp.route("/reviews/<int:review_id>", methods=["DELETE"])
@jwt_required()
def delete_review(review_id):
    current_user = get_jwt_identity()
    session = get_session()
    user = session.query(User).filter_by(
        email=current_user
    ).first()
    if user is None:
        session.close()
        return jsonify({"message": "User not found"}), 404
    review = session.query(Review).filter_by(
        id=review_id
    ).first()
    if review is None:
        session.close()
        return jsonify({"message": "Review not found"}), 404
    if review.user_id != user.id:
        session.close()
        return jsonify({
            "message": "You are not authorized to delete this review"
        }), 403
    session.delete(review)
    session.commit()
    session.close()
    return jsonify({
        "message": "Review deleted successfully"
    }), 200