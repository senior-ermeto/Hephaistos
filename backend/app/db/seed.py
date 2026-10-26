from datetime import datetime, timedelta, time
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.models import (
    User,
    UserRole,
    Machine,
    MachineDeclaration,
    OperatorShift,
    DeclarationStatus,
    utc_now,
)


def init_db_and_seed(db: Session):
    # 1. Vérifier/créer le compte administrateur principal
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

    if not settings.SEED_DEMO_DATA:
        return

    # Si des machines existent déjà, ne pas ré-insérer les données de démonstration
    if db.query(Machine).count() > 0:
        return

    # 2. Création des opérateurs et responsables Senior Aerospace Ermeto
    demo_users_spec = [
        ("c.martin", "Claire", "Martin", "1111", "BADGE-MGR-01", UserRole.MANAGER.value),
        ("m.dubois", "Marc", "Dubois", "1234", "BADGE-OP-101", UserRole.OPERATOR.value),
        ("s.laurent", "Sophie", "Laurent", "2345", "BADGE-OP-102", UserRole.OPERATOR.value),
        ("k.benali", "Karim", "Benali", "3456", "BADGE-OP-103", UserRole.OPERATOR.value),
        ("j.moreau", "Julien", "Moreau", "4567", "BADGE-OP-104", UserRole.OPERATOR.value),
        ("l.garnier", "Lucas", "Garnier", "5678", "BADGE-OP-105", UserRole.OPERATOR.value),
    ]

    operators = []
    for uname, fname, lname, pin, badge, role in demo_users_spec:
        u = db.query(User).filter(User.username == uname).first()
        if not u:
            u = User(
                username=uname,
                hashed_password=get_password_hash("ermeto2026"),
                pin_code=pin,
                first_name=fname,
                last_name=lname,
                badge_code=badge,
                role=role,
                is_active=True,
            )
            db.add(u)
            db.flush()
        if role == UserRole.OPERATOR.value:
            operators.append(u)

    # 3. Création du parc machines Senior Aerospace Ermeto
    machines_spec = [
        (
            "CNC-MAZAK-01",
            "Tour CNC Mazak Integrex i-200",
            "Îlot Tournage Aéronautique",
            "Usinage raccords haute pression titane & inox aéronautique",
        ),
        (
            "CNC-DMG-02",
            "Centre 5 Axes DMG MORI DMU 50",
            "Îlot Fraisage Précision",
            "Corps de vannes et coudes complexes série aéronautique",
        ),
        (
            "CNC-CITIZEN-03",
            "Décolleteuse Citizen Cincom L20",
            "Îlot Décolletage",
            "Bagues et écrous haute précision Ermeto",
        ),
        (
            "RECT-STUDER-04",
            "Rectifieuse Cylindrique Studer S33",
            "Îlot Finition & Rectification",
            "Rectification portées d'étanchéité coniques",
        ),
        (
            "CTRL-ZEISS-05",
            "MMT Zeiss Contura 3D",
            "Îlot Contrôle Qualité",
            "Contrôle tridimensionnel dimensionnel série EN9100",
        ),
        (
            "ASB-HYDRO-06",
            "Banc Assemblage & Test Hydraulique 700b",
            "Îlot Assemblage & Essais",
            "Montage final et épreuve haute pression raccords Ermeto",
        ),
    ]

    machines = []
    for code, name, sector, desc in machines_spec:
        m = Machine(
            code=code,
            name=name,
            workshop_sector=sector,
            description=desc,
            current_status=DeclarationStatus.PRODUCTION.value,
            status_updated_at=utc_now(),
            is_active=True,
        )
        db.add(m)
        db.flush()
        machines.append(m)

    # 4. Génération d'historique sur la semaine précédente (W-1) et la semaine en cours (W)
    now = utc_now()
    iso_cal = now.isocalendar()
    current_monday = datetime.combine(
        now.date() - timedelta(days=iso_cal.weekday - 1), time.min
    )
    prev_monday = current_monday - timedelta(days=7)

    # Scénarios types pour une journée d'atelier (7h00 -> 16h30)
    daily_patterns = [
        [
            (7, 0, 10, 15, DeclarationStatus.PRODUCTION.value, None, "OF-2026-8410"),
            (10, 15, 10, 30, DeclarationStatus.PAUSE.value, "Pause matin équipe A", "OF-2026-8410"),
            (10, 30, 12, 30, DeclarationStatus.PRODUCTION.value, None, "OF-2026-8410"),
            (12, 30, 13, 15, DeclarationStatus.PAUSE.value, "Pause déjeuner", "OF-2026-8410"),
            (13, 15, 14, 0, DeclarationStatus.STOP_TOOL_CHANGE.value, "Remplacement plaquettes carbure + réglage jauge", "OF-2026-8412"),
            (14, 0, 16, 30, DeclarationStatus.PRODUCTION.value, None, "OF-2026-8412"),
        ],
        [
            (7, 0, 9, 30, DeclarationStatus.PRODUCTION.value, None, "OF-2026-8420"),
            (9, 30, 10, 45, DeclarationStatus.STOP_WAITING.value, "Attente validation première pièce contrôle 3D", "OF-2026-8420"),
            (10, 45, 12, 30, DeclarationStatus.PRODUCTION.value, None, "OF-2026-8420"),
            (12, 30, 13, 15, DeclarationStatus.PAUSE.value, "Pause méridienne", "OF-2026-8420"),
            (13, 15, 16, 30, DeclarationStatus.PRODUCTION.value, None, "OF-2026-8420"),
        ],
        [
            (7, 0, 8, 45, DeclarationStatus.PRODUCTION.value, None, "OF-2026-8435"),
            (8, 45, 10, 15, DeclarationStatus.STOP_BREAKDOWN.value, "Défaut pression arrosage haute pression - intervention maintenance", "OF-2026-8435"),
            (10, 15, 12, 30, DeclarationStatus.PRODUCTION.value, None, "OF-2026-8435"),
            (12, 30, 13, 15, DeclarationStatus.PAUSE.value, "Pause repas", "OF-2026-8435"),
            (13, 15, 15, 15, DeclarationStatus.PRODUCTION.value, None, "OF-2026-8435"),
            (15, 15, 16, 30, DeclarationStatus.STOP_OTHER.value, "Nettoyage 5S hebdomadaire & calibration palpeur", "OF-2026-8435"),
        ],
    ]

    # Peupler Semaine W-1 complète (Lundi à Vendredi)
    for day_offset in range(5):
        day_base = prev_monday + timedelta(days=day_offset)
        for m_idx, m in enumerate(machines):
            op = operators[(m_idx + day_offset) % len(operators)]
            pattern = daily_patterns[(m_idx + day_offset) % len(daily_patterns)]
            for h1, m1, h2, m2, st, reason, of_ref in pattern:
                start_dt = day_base.replace(hour=h1, minute=m1, second=0)
                end_dt = day_base.replace(hour=h2, minute=m2, second=0)
                dur = int((end_dt - start_dt).total_seconds())
                db.add(
                    MachineDeclaration(
                        machine_id=m.id,
                        user_id=op.id,
                        status_type=st,
                        reason_detail=reason,
                        order_reference=of_ref,
                        started_at=start_dt,
                        ended_at=end_dt,
                        duration_seconds=dur,
                    )
                )

    # Peupler Semaine en cours jusqu'à maintenant
    live_statuses = [
        (DeclarationStatus.PRODUCTION.value, None, "OF-2026-8501"),
        (DeclarationStatus.PRODUCTION.value, None, "OF-2026-8504"),
        (DeclarationStatus.STOP_TOOL_CHANGE.value, "Montage porte-outil filetage UNJF", "OF-2026-8509"),
        (DeclarationStatus.PRODUCTION.value, None, "OF-2026-8512"),
        (DeclarationStatus.STOP_WAITING.value, "Attente lot matière Inconel 718", "OF-2026-8515"),
        (DeclarationStatus.STOP_OTHER.value, "Audit qualité client aéronautique sur banc", "OF-2026-8518"),
    ]

    days_elapsed = min(iso_cal.weekday, 5)
    for day_offset in range(days_elapsed):
        day_base = current_monday + timedelta(days=day_offset)
        is_today = day_Base_date = day_base.date() == now.date()

        for m_idx, m in enumerate(machines):
            op = operators[(m_idx + day_offset) % len(operators)]
            prev_op = operators[(m_idx + day_offset - 1) % len(operators)]

            if not is_today:
                pattern = daily_patterns[(m_idx + day_offset) % len(daily_patterns)]
                for h1, m1, h2, m2, st, reason, of_ref in pattern:
                    start_dt = day_base.replace(hour=h1, minute=m1, second=0)
                    end_dt = day_base.replace(hour=h2, minute=m2, second=0)
                    if end_dt < now:
                        db.add(
                            MachineDeclaration(
                                machine_id=m.id,
                                user_id=op.id,
                                status_type=st,
                                reason_detail=reason,
                                order_reference=of_ref,
                                started_at=start_dt,
                                ended_at=end_dt,
                                duration_seconds=int((end_dt - start_dt).total_seconds()),
                            )
                        )
            else:
                # Aujourd'hui : créer une session antérieure + la déclaration active en cours
                early_start = now - timedelta(hours=4, minutes=30)
                mid_switch = now - timedelta(hours=1, minutes=15 + (m_idx * 7))

                db.add(
                    MachineDeclaration(
                        machine_id=m.id,
                        user_id=prev_op.id,
                        status_type=DeclarationStatus.PRODUCTION.value,
                        reason_detail=None,
                        order_reference=f"OF-2026-849{m_idx}",
                        started_at=early_start,
                        ended_at=mid_switch,
                        duration_seconds=int((mid_switch - early_start).total_seconds()),
                    )
                )

                # Log changement d'opérateur aujourd'hui
                db.add(
                    OperatorShift(
                        machine_id=m.id,
                        user_id=op.id,
                        previous_user_id=prev_op.id,
                        action_type="OPERATOR_CHANGE",
                        notes=f"Relève d'équipe sur {m.code}",
                        timestamp=mid_switch,
                    )
                )

                live_st, live_reason, live_of = live_statuses[m_idx % len(live_statuses)]
                db.add(
                    MachineDeclaration(
                        machine_id=m.id,
                        user_id=op.id,
                        status_type=live_st,
                        reason_detail=live_reason,
                        order_reference=live_of,
                        started_at=mid_switch,
                        ended_at=None,
                        duration_seconds=0,
                    )
                )

                m.current_status = live_st
                m.current_reason = live_reason
                m.current_order_reference = live_of
                m.current_operator_id = op.id
                m.status_updated_at = mid_switch

    db.commit()
