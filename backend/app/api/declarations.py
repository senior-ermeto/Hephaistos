from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.db.models import (
    Machine,
    User,
    MachineDeclaration,
    OperatorShift,
    DeclarationStatus,
    STATUS_LABELS_FR,
    utc_now,
)
from app.schemas.schemas import (
    DeclarationCreate,
    DeclarationOut,
    OperatorChangeCreate,
    OperatorShiftOut,
)
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/declarations", tags=["Déclarations & Suivi Atelier"])


def serialize_declaration(decl: MachineDeclaration, now_dt=None) -> DeclarationOut:
    if now_dt is None:
        now_dt = utc_now()
    is_ongoing = decl.ended_at is None
    if decl.duration_seconds is not None and not is_ongoing:
        dur = max(0, decl.duration_seconds)
    else:
        end_ref = decl.ended_at or now_dt
        dur = max(0, int((end_ref - decl.started_at).total_seconds()))

    return DeclarationOut(
        id=decl.id,
        machine_id=decl.machine_id,
        machine_code=decl.machine.code if decl.machine else f"M-{decl.machine_id}",
        machine_name=decl.machine.name if decl.machine else "Machine",
        workshop_sector=decl.machine.workshop_sector if decl.machine else "Atelier",
        user_id=decl.user_id,
        user_first_name=decl.user.first_name if decl.user else "Opérateur",
        user_last_name=decl.user.last_name if decl.user else "Inconnu",
        user_username=decl.user.username if decl.user else "inconnu",
        status_type=decl.status_type,
        status_label=STATUS_LABELS_FR.get(decl.status_type, decl.status_type),
        reason_detail=decl.reason_detail,
        order_reference=decl.order_reference,
        started_at=decl.started_at,
        ended_at=decl.ended_at,
        duration_seconds=dur,
        is_ongoing=is_ongoing,
    )


@router.post("", response_model=DeclarationOut, status_code=status.HTTP_201_CREATED)
async def create_declaration(
    payload: DeclarationCreate,
    db: Session = Depends(get_db),
):
    machine = db.query(Machine).filter(Machine.id == payload.machine_id).first()
    if not machine or not machine.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine introuvable ou inactive",
        )

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opérateur introuvable ou inactif",
        )

    valid_statuses = [s.value for s in DeclarationStatus]
    status_clean = payload.status_type.strip().upper()
    if status_clean not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Statut invalide. Valeurs autorisées : {', '.join(valid_statuses)}",
        )

    reason_clean = payload.reason_detail.strip() if payload.reason_detail else None
    if status_clean == DeclarationStatus.STOP_OTHER.value and not reason_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Veuillez préciser un motif en texte pour 'Autres arrêts'.",
        )

    now = utc_now()

    # Clôturer la déclaration précédente en cours sur cette machine
    active_decls = (
        db.query(MachineDeclaration)
        .filter(
            MachineDeclaration.machine_id == machine.id,
            MachineDeclaration.ended_at.is_(None),
        )
        .all()
    )
    for prev_decl in active_decls:
        prev_decl.ended_at = now
        prev_decl.duration_seconds = max(
            0, int((now - prev_decl.started_at).total_seconds())
        )

    # Si l'opérateur a changé sur la machine, enregistrer automatiquement un log
    if machine.current_operator_id and machine.current_operator_id != user.id:
        shift_log = OperatorShift(
            machine_id=machine.id,
            user_id=user.id,
            previous_user_id=machine.current_operator_id,
            action_type="OPERATOR_CHANGE",
            notes=f"Prise de poste sur {machine.code} ({STATUS_LABELS_FR.get(status_clean, status_clean)})",
            timestamp=now,
        )
        db.add(shift_log)

    new_decl = MachineDeclaration(
        machine_id=machine.id,
        user_id=user.id,
        status_type=status_clean,
        reason_detail=reason_clean,
        order_reference=payload.order_reference.strip() if payload.order_reference else None,
        started_at=now,
        ended_at=None,
        duration_seconds=0,
    )
    db.add(new_decl)

    # Mise à jour de l'état temps réel de la machine
    machine.current_status = status_clean
    machine.current_reason = reason_clean
    if payload.order_reference:
        machine.current_order_reference = payload.order_reference.strip()
    machine.current_operator_id = user.id
    machine.status_updated_at = now

    db.commit()
    db.refresh(new_decl)

    out = serialize_declaration(new_decl, now)

    await ws_manager.broadcast({
        "event": "DECLARATION_CREATED",
        "machine_id": machine.id,
        "machine_code": machine.code,
        "status_type": status_clean,
        "status_label": STATUS_LABELS_FR.get(status_clean, status_clean),
        "operator_name": f"{user.first_name} {user.last_name}",
        "reason_detail": reason_clean,
        "timestamp": now.isoformat(),
    })

    return out


@router.post("/operator-change", response_model=OperatorShiftOut, status_code=status.HTTP_201_CREATED)
async def log_operator_change(
    payload: OperatorChangeCreate,
    db: Session = Depends(get_db),
):
    """Journalise un changement d'opérateur depuis le bouton dédié (Android ou Web)."""
    new_user = db.query(User).filter(User.id == payload.user_id, User.is_active.is_(True)).first()
    if not new_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nouvel opérateur introuvable ou inactif",
        )

    if payload.pin_code is not None and new_user.pin_code:
        if payload.pin_code.strip() != new_user.pin_code.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Code PIN de l'opérateur incorrect",
            )

    prev_user = None
    if payload.previous_user_id:
        prev_user = db.query(User).filter(User.id == payload.previous_user_id).first()

    machine = None
    if payload.machine_id:
        machine = db.query(Machine).filter(Machine.id == payload.machine_id).first()
        if machine:
            if not prev_user and machine.current_operator_id:
                prev_user = db.query(User).filter(User.id == machine.current_operator_id).first()
            machine.current_operator_id = new_user.id

    now = utc_now()
    notes_text = payload.notes.strip() if payload.notes else "Changement d'opérateur déclaré"

    shift = OperatorShift(
        machine_id=machine.id if machine else None,
        user_id=new_user.id,
        previous_user_id=prev_user.id if prev_user else None,
        action_type="OPERATOR_CHANGE",
        notes=notes_text,
        timestamp=now,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)

    await ws_manager.broadcast({
        "event": "OPERATOR_CHANGE",
        "user_id": new_user.id,
        "user_name": f"{new_user.first_name} {new_user.last_name}",
        "previous_user_name": f"{prev_user.first_name} {prev_user.last_name}" if prev_user else None,
        "machine_id": machine.id if machine else None,
        "machine_code": machine.code if machine else None,
        "timestamp": now.isoformat(),
    })

    return OperatorShiftOut(
        id=shift.id,
        machine_id=machine.id if machine else None,
        machine_code=machine.code if machine else None,
        machine_name=machine.name if machine else None,
        user_id=new_user.id,
        user_first_name=new_user.first_name,
        user_last_name=new_user.last_name,
        previous_user_id=prev_user.id if prev_user else None,
        previous_user_name=f"{prev_user.first_name} {prev_user.last_name}" if prev_user else None,
        action_type=shift.action_type,
        notes=shift.notes,
        timestamp=shift.timestamp,
    )


@router.get("", response_model=List[DeclarationOut])
def list_declarations(
    machine_id: Optional[int] = None,
    user_id: Optional[int] = None,
    status_type: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    query = db.query(MachineDeclaration).options(
        joinedload(MachineDeclaration.machine),
        joinedload(MachineDeclaration.user),
    )
    if machine_id is not None:
        query = query.filter(MachineDeclaration.machine_id == machine_id)
    if user_id is not None:
        query = query.filter(MachineDeclaration.user_id == user_id)
    if status_type:
        query = query.filter(MachineDeclaration.status_type == status_type.upper())

    decls = (
        query.order_by(MachineDeclaration.started_at.desc())
        .limit(min(limit, 1000))
        .all()
    )
    now = utc_now()
    return [serialize_declaration(d, now) for d in decls]


@router.get("/operator-shifts", response_model=List[OperatorShiftOut])
def list_operator_shifts(
    user_id: Optional[int] = None,
    machine_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(OperatorShift).options(
        joinedload(OperatorShift.machine),
        joinedload(OperatorShift.user),
        joinedload(OperatorShift.previous_user),
    )
    if user_id is not None:
        query = query.filter(
            (OperatorShift.user_id == user_id)
            | (OperatorShift.previous_user_id == user_id)
        )
    if machine_id is not None:
        query = query.filter(OperatorShift.machine_id == machine_id)

    shifts = query.order_by(OperatorShift.timestamp.desc()).limit(min(limit, 500)).all()
    results = []
    for s in shifts:
        results.append(
            OperatorShiftOut(
                id=s.id,
                machine_id=s.machine_id,
                machine_code=s.machine.code if s.machine else None,
                machine_name=s.machine.name if s.machine else None,
                user_id=s.user_id,
                user_first_name=s.user.first_name if s.user else "Opérateur",
                user_last_name=s.user.last_name if s.user else "",
                previous_user_id=s.previous_user_id,
                previous_user_name=(
                    f"{s.previous_user.first_name} {s.previous_user.last_name}"
                    if s.previous_user
                    else None
                ),
                action_type=s.action_type,
                notes=s.notes,
                timestamp=s.timestamp,
            )
        )
    return results
