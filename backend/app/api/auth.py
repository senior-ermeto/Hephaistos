from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List

from app.core.security import verify_password, create_access_token
from app.db.session import get_db
from app.db.models import User, OperatorShift, utc_now
from app.schemas.schemas import (
    LoginRequest,
    OperatorLoginRequest,
    TokenResponse,
    UserSummary,
)
from app.api.deps import get_current_user
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(User.username == payload.username.strip())
        .first()
    )
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant ou mot de passe incorrect",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte utilisateur est désactivé",
        )

    access_token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(
        access_token=access_token,
        user=UserSummary.model_validate(user),
    )


@router.post("/token")
def login_oauth2(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.username == form_data.username.strip())
        .first()
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant ou mot de passe incorrect",
        )
    access_token = create_access_token(subject=user.id, role=user.role)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/operator-login", response_model=TokenResponse)
async def operator_login(
    payload: OperatorLoginRequest,
    db: Session = Depends(get_db),
):
    user = None
    if payload.badge_code:
        user = (
            db.query(User)
            .filter(User.badge_code == payload.badge_code.strip(), User.is_active.is_(True))
            .first()
        )
    elif payload.user_id is not None:
        user = (
            db.query(User)
            .filter(User.id == payload.user_id, User.is_active.is_(True))
            .first()
        )
        if user and payload.pin_code is not None and user.pin_code:
            if payload.pin_code.strip() != user.pin_code.strip():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Code PIN opérateur incorrect",
                )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opérateur introuvable ou inactif",
        )

    shift = OperatorShift(
        machine_id=payload.machine_id,
        user_id=user.id,
        action_type="LOGIN",
        notes="Connexion terminal opérateur Android/Atelier",
        timestamp=utc_now(),
    )
    db.add(shift)
    db.commit()

    await ws_manager.broadcast({
        "event": "OPERATOR_LOGIN",
        "user_id": user.id,
        "user_name": f"{user.first_name} {user.last_name}",
        "machine_id": payload.machine_id,
    })

    access_token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(
        access_token=access_token,
        user=UserSummary.model_validate(user),
    )


@router.get("/operators", response_model=List[UserSummary])
def list_active_operators(db: Session = Depends(get_db)):
    """Liste des opérateurs actifs pour l'application Android et le terminal atelier."""
    users = (
        db.query(User)
        .filter(User.is_active.is_(True))
        .order_by(User.last_name.asc(), User.first_name.asc())
        .all()
    )
    return [UserSummary.model_validate(u) for u in users]


@router.get("/me", response_model=UserSummary)
def get_me(current_user: User = Depends(get_current_user)):
    return UserSummary.model_validate(current_user)
