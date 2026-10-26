from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import get_db
from app.db.models import User, UserRole
from app.schemas.schemas import UserCreate, UserUpdate, UserSummary
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/users", tags=["Gestion des Utilisateurs"])


@router.get("", response_model=List[UserSummary])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    users = db.query(User).order_by(User.last_name.asc(), User.first_name.asc()).all()
    return [UserSummary.model_validate(u) for u in users]


@router.post("", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    existing = (
        db.query(User)
        .filter(User.username == payload.username.strip())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec cet identifiant existe déjà",
        )

    if payload.badge_code:
        existing_badge = (
            db.query(User)
            .filter(User.badge_code == payload.badge_code.strip())
            .first()
        )
        if existing_badge:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce numéro de badge est déjà attribué à un autre utilisateur",
            )

    role = payload.role.upper()
    if role not in [r.value for r in UserRole]:
        role = UserRole.OPERATOR.value

    new_user = User(
        username=payload.username.strip(),
        hashed_password=get_password_hash(payload.password),
        pin_code=payload.pin_code.strip() if payload.pin_code else "0000",
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        badge_code=payload.badge_code.strip() if payload.badge_code else None,
        role=role,
        is_active=payload.is_active,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserSummary.model_validate(new_user)


@router.put("/{user_id}", response_model=UserSummary)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable",
        )

    if payload.first_name is not None:
        user.first_name = payload.first_name.strip()
    if payload.last_name is not None:
        user.last_name = payload.last_name.strip()
    if payload.password is not None and payload.password.strip():
        user.hashed_password = get_password_hash(payload.password.strip())
    if payload.pin_code is not None:
        user.pin_code = payload.pin_code.strip()
    if payload.badge_code is not None:
        user.badge_code = payload.badge_code.strip() or None
    if payload.role is not None and payload.role.upper() in [r.value for r in UserRole]:
        user.role = payload.role.upper()
    if payload.is_active is not None:
        if user.id == current_admin.id and not payload.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas désactiver votre propre compte administrateur",
            )
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return UserSummary.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="Impossible de supprimer votre propre compte administrateur",
        )
    user.is_active = False
    db.commit()
    return None
