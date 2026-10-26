from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.db.models import Machine, User, DeclarationStatus, utc_now
from app.schemas.schemas import MachineCreate, MachineUpdate, MachineOut
from app.api.deps import get_current_admin_or_manager
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/machines", tags=["Machines"])


@router.get("", response_model=List[MachineOut])
def list_machines(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Machine).options(joinedload(Machine.current_operator))
    if not include_inactive:
        query = query.filter(Machine.is_active.is_(True))
    machines = query.order_by(Machine.workshop_sector.asc(), Machine.code.asc()).all()
    return [MachineOut.model_validate(m) for m in machines]


@router.get("/{machine_id}", response_model=MachineOut)
def get_machine(machine_id: int, db: Session = Depends(get_db)):
    machine = (
        db.query(Machine)
        .options(joinedload(Machine.current_operator))
        .filter(Machine.id == machine_id)
        .first()
    )
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")
    return MachineOut.model_validate(machine)


@router.post("", response_model=MachineOut, status_code=status.HTTP_201_CREATED)
async def create_machine(
    payload: MachineCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_or_manager),
):
    existing = (
        db.query(Machine)
        .filter(Machine.code == payload.code.strip().upper())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une machine avec ce code existe déjà",
        )

    new_machine = Machine(
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        workshop_sector=payload.workshop_sector.strip() or "Atelier Principal",
        description=payload.description.strip() if payload.description else None,
        current_status=DeclarationStatus.PAUSE.value,
        status_updated_at=utc_now(),
        is_active=True,
    )
    db.add(new_machine)
    db.commit()
    db.refresh(new_machine)

    await ws_manager.broadcast({
        "event": "MACHINE_CREATED",
        "machine_id": new_machine.id,
        "code": new_machine.code,
        "name": new_machine.name,
    })

    return MachineOut.model_validate(new_machine)


@router.put("/{machine_id}", response_model=MachineOut)
async def update_machine(
    machine_id: int,
    payload: MachineUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_or_manager),
):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine introuvable")

    if payload.code is not None:
        code_clean = payload.code.strip().upper()
        conflict = (
            db.query(Machine)
            .filter(Machine.code == code_clean, Machine.id != machine_id)
            .first()
        )
        if conflict:
            raise HTTPException(status_code=400, detail="Ce code machine est déjà utilisé")
        machine.code = code_clean

    if payload.name is not None:
        machine.name = payload.name.strip()
    if payload.workshop_sector is not None:
        machine.workshop_sector = payload.workshop_sector.strip()
    if payload.description is not None:
        machine.description = payload.description.strip() or None
    if payload.is_active is not None:
        machine.is_active = payload.is_active

    db.commit()
    db.refresh(machine)

    await ws_manager.broadcast({
        "event": "MACHINE_UPDATED",
        "machine_id": machine.id,
    })

    return MachineOut.model_validate(machine)
