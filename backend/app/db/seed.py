from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.models import (
    User,
    UserRole,
    Machine,
    MachineDeclaration,
    OperatorShift,
)

DEMO_USERNAMES = [
    "c.martin",
    "m.dubois",
    "s.laurent",
    "k.benali",
    "j.moreau",
    "l.garnier",
]

DEMO_MACHINE_CODES = [
    "CNC-MAZAK-01",
    "CNC-DMG-02",
    "CNC-CITIZEN-03",
    "RECT-STUDER-04",
    "CTRL-ZEISS-05",
    "ASB-HYDRO-06",
]


def init_db_and_seed(db: Session):
    """
    Initialise uniquement le compte Administrateur principal et supprime
    les éventuelles données de démonstration résiduelles.
    """
    # 1. Supprimer les éventuelles données de démo si présentes en base
    demo_machines = (
        db.query(Machine)
        .filter(Machine.code.in_(DEMO_MACHINE_CODES))
        .all()
    )
    if demo_machines:
        demo_machine_ids = [m.id for m in demo_machines]
        db.query(OperatorShift).filter(
            OperatorShift.machine_id.in_(demo_machine_ids)
        ).delete(synchronize_session=False)
        db.query(MachineDeclaration).filter(
            MachineDeclaration.machine_id.in_(demo_machine_ids)
        ).delete(synchronize_session=False)
        db.query(Machine).filter(
            Machine.id.in_(demo_machine_ids)
        ).delete(synchronize_session=False)
        db.commit()

    demo_users = (
        db.query(User)
        .filter(User.username.in_(DEMO_USERNAMES))
        .all()
    )
    if demo_users:
        demo_user_ids = [u.id for u in demo_users]
        db.query(OperatorShift).filter(
            (OperatorShift.user_id.in_(demo_user_ids))
            | (OperatorShift.previous_user_id.in_(demo_user_ids))
        ).delete(synchronize_session=False)
        db.query(MachineDeclaration).filter(
            MachineDeclaration.user_id.in_(demo_user_ids)
        ).delete(synchronize_session=False)
        db.query(User).filter(
            User.id.in_(demo_user_ids)
        ).delete(synchronize_session=False)
        db.commit()

    # 2. Vérifier / créer uniquement le compte administrateur principal
    admin = (
        db.query(User)
        .filter(User.username == settings.FIRST_ADMIN_USERNAME)
        .first()
    )
    if not admin:
        admin = User(
            username=settings.FIRST_ADMIN_USERNAME,
            hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
            pin_code="0000",
            first_name=settings.FIRST_ADMIN_FIRSTNAME,
            last_name=settings.FIRST_ADMIN_LASTNAME,
            badge_code="BADGE-ADMIN-01",
            role=UserRole.ADMIN.value,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
