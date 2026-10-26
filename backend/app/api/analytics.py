from datetime import datetime, date, timedelta, time
from typing import Optional, Dict, List
import io
import csv
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.db.models import (
    Machine,
    MachineDeclaration,
    OperatorShift,
    DeclarationStatus,
    STATUS_LABELS_FR,
    utc_now,
)
from app.schemas.schemas import (
    WeeklyAnalyticsResponse,
    MachineWeeklyRow,
    DailyMachineCell,
    OperatorShiftOut,
)
from app.api.declarations import serialize_declaration

router = APIRouter(prefix="/analytics", tags=["Tableau Hebdomadaire & Statistiques"])

FRENCH_DAY_NAMES = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche",
]

ALL_STATUS_KEYS = [s.value for s in DeclarationStatus]
DOWNTIME_STATUS_KEYS = [
    DeclarationStatus.STOP_TOOL_CHANGE.value,
    DeclarationStatus.STOP_WAITING.value,
    DeclarationStatus.STOP_BREAKDOWN.value,
    DeclarationStatus.STOP_OTHER.value,
]


def get_week_bounds(year: Optional[int], week: Optional[int]):
    now = utc_now()
    iso_cal = now.isocalendar()
    target_year = year or iso_cal.year
    target_week = week or iso_cal.week

    try:
        monday_date = date.fromisocalendar(target_year, target_week, 1)
    except ValueError:
        monday_date = date.fromisocalendar(iso_cal.year, iso_cal.week, 1)
        target_year = iso_cal.year
        target_week = iso_cal.week

    sunday_date = monday_date + timedelta(days=6)
    week_start_dt = datetime.combine(monday_date, time.min)
    week_end_dt = datetime.combine(sunday_date, time.max)
    return target_year, target_week, monday_date, sunday_date, week_start_dt, week_end_dt


@router.get("/weekly", response_model=WeeklyAnalyticsResponse)
def get_weekly_analytics(
    year: Optional[int] = Query(None, description="Année ISO (ex: 2026)"),
    week: Optional[int] = Query(None, description="Numéro de semaine ISO (1-53)"),
    user_id: Optional[int] = Query(None, description="Filtrer par opérateur/utilisateur"),
    machine_id: Optional[int] = Query(None, description="Filtrer par machine"),
    status_type: Optional[str] = Query(None, description="Filtrer par type de déclaration"),
    db: Session = Depends(get_db),
):
    now = utc_now()
    (
        target_year,
        target_week,
        monday_date,
        sunday_date,
        week_start_dt,
        week_end_dt,
    ) = get_week_bounds(year, week)

    # Récupérer les machines actives (ou la machine filtrée)
    m_query = db.query(Machine).options(joinedload(Machine.current_operator)).filter(Machine.is_active.is_(True))
    if machine_id is not None:
        m_query = m_query.filter(Machine.id == machine_id)
    machines = m_query.order_by(Machine.workshop_sector.asc(), Machine.code.asc()).all()

    # Récupérer toutes les déclarations qui chevauchent la semaine sélectionnée
    decl_query = (
        db.query(MachineDeclaration)
        .options(
            joinedload(MachineDeclaration.machine),
            joinedload(MachineDeclaration.user),
        )
        .filter(
            MachineDeclaration.started_at <= week_end_dt,
            (MachineDeclaration.ended_at.is_(None))
            | (MachineDeclaration.ended_at >= week_start_dt),
        )
    )
    if user_id is not None:
        decl_query = decl_query.filter(MachineDeclaration.user_id == user_id)
    if machine_id is not None:
        decl_query = decl_query.filter(MachineDeclaration.machine_id == machine_id)
    if status_type:
        decl_query = decl_query.filter(MachineDeclaration.status_type == status_type.upper())

    declarations = decl_query.order_by(MachineDeclaration.started_at.desc()).all()

    # Récupérer les changements d'opérateur de la semaine
    shifts_query = (
        db.query(OperatorShift)
        .options(
            joinedload(OperatorShift.machine),
            joinedload(OperatorShift.user),
            joinedload(OperatorShift.previous_user),
        )
        .filter(
            OperatorShift.timestamp >= week_start_dt,
            OperatorShift.timestamp <= week_end_dt,
        )
    )
    if user_id is not None:
        shifts_query = shifts_query.filter(
            (OperatorShift.user_id == user_id)
            | (OperatorShift.previous_user_id == user_id)
        )
    if machine_id is not None:
        shifts_query = shifts_query.filter(OperatorShift.machine_id == machine_id)

    shifts = shifts_query.order_by(OperatorShift.timestamp.desc()).all()

    # Construction de la matrice Machine x 7 Jours (Lundi -> Dimanche)
    machine_rows: List[MachineWeeklyRow] = []
    global_prod_sec = 0
    global_down_sec = 0
    global_pause_sec = 0
    global_total_sec = 0

    for m in machines:
        m_decls = [d for d in declarations if d.machine_id == m.id]
        weekly_totals: Dict[str, int] = {k: 0 for k in ALL_STATUS_KEYS}
        days_cells: List[DailyMachineCell] = []
        weekly_decl_count = len(m_decls)

        for day_idx in range(7):
            current_day_date = monday_date + timedelta(days=day_idx)
            day_start = datetime.combine(current_day_date, time.min)
            day_end = datetime.combine(current_day_date, time.max)

            day_durations: Dict[str, int] = {k: 0 for k in ALL_STATUS_KEYS}
            day_decl_count = 0
            last_op_name = None
            latest_start_in_day = None

            for d in m_decls:
                d_start = d.started_at
                d_end = d.ended_at or now
                # Ignorer si la déclaration commence dans le futur
                if d_start > now:
                    continue

                overlap_start = max(d_start, day_start)
                overlap_end = min(d_end, day_end, now)

                if overlap_end > overlap_start:
                    overlap_seconds = int((overlap_end - overlap_start).total_seconds())
                    st = d.status_type if d.status_type in day_durations else DeclarationStatus.STOP_OTHER.value
                    day_durations[st] += overlap_seconds
                    weekly_totals[st] += overlap_seconds
                    day_decl_count += 1

                    if latest_start_in_day is None or d_start >= latest_start_in_day:
                        latest_start_in_day = d_start
                        if d.user:
                            last_op_name = f"{d.user.first_name} {d.user.last_name}"

            prod_s = day_durations[DeclarationStatus.PRODUCTION.value]
            pause_s = day_durations[DeclarationStatus.PAUSE.value]
            down_s = sum(day_durations[k] for k in DOWNTIME_STATUS_KEYS)
            tot_s = prod_s + pause_s + down_s

            active_denom = prod_s + down_s
            trs_pct = round((prod_s / active_denom) * 100.0, 1) if active_denom > 0 else 0.0

            dominant = None
            if tot_s > 0:
                dominant = max(day_durations.items(), key=lambda kv: kv[1])[0]

            days_cells.append(
                DailyMachineCell(
                    date=current_day_date.isoformat(),
                    day_label=FRENCH_DAY_NAMES[day_idx],
                    durations_by_status=day_durations,
                    total_tracked_seconds=tot_s,
                    production_seconds=prod_s,
                    downtime_seconds=down_s,
                    pause_seconds=pause_s,
                    trs_availability_pct=trs_pct,
                    declarations_count=day_decl_count,
                    dominant_status=dominant,
                    last_operator_name=last_op_name,
                )
            )

        w_prod = weekly_totals[DeclarationStatus.PRODUCTION.value]
        w_pause = weekly_totals[DeclarationStatus.PAUSE.value]
        w_down = sum(weekly_totals[k] for k in DOWNTIME_STATUS_KEYS)
        w_tot = w_prod + w_pause + w_down
        w_denom = w_prod + w_down
        w_trs = round((w_prod / w_denom) * 100.0, 1) if w_denom > 0 else 0.0

        global_prod_sec += w_prod
        global_down_sec += w_down
        global_pause_sec += w_pause
        global_total_sec += w_tot

        curr_op_name = (
            f"{m.current_operator.first_name} {m.current_operator.last_name}"
            if m.current_operator
            else None
        )

        machine_rows.append(
            MachineWeeklyRow(
                machine_id=m.id,
                machine_code=m.code,
                machine_name=m.name,
                workshop_sector=m.workshop_sector,
                current_status=m.current_status,
                current_operator_name=curr_op_name,
                days=days_cells,
                weekly_totals_by_status=weekly_totals,
                weekly_production_seconds=w_prod,
                weekly_downtime_seconds=w_down,
                weekly_pause_seconds=w_pause,
                weekly_total_seconds=w_tot,
                weekly_trs_pct=w_trs,
                weekly_declarations_count=weekly_decl_count,
            )
        )

    global_denom = global_prod_sec + global_down_sec
    global_trs = round((global_prod_sec / global_denom) * 100.0, 1) if global_denom > 0 else 0.0

    serialized_decls = [serialize_declaration(d, now) for d in declarations]
    serialized_shifts = [
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
        for s in shifts
    ]

    week_label = (
        f"Semaine {target_week:02d} ({monday_date.strftime('%d/%m/%Y')} au {sunday_date.strftime('%d/%m/%Y')})"
    )

    return WeeklyAnalyticsResponse(
        year=target_year,
        week=target_week,
        week_start_date=monday_date.isoformat(),
        week_end_date=sunday_date.isoformat(),
        week_label=week_label,
        global_kpis={
            "trs_availability_pct": global_trs,
            "production_seconds": global_prod_sec,
            "downtime_seconds": global_down_sec,
            "pause_seconds": global_pause_sec,
            "total_seconds": global_total_sec,
            "declarations_count": len(serialized_decls),
            "operator_shifts_count": len(serialized_shifts),
            "active_machines_count": len(machines),
        },
        machine_rows=machine_rows,
        declarations=serialized_decls,
        operator_shifts=serialized_shifts,
    )


@router.get("/export-csv")
def export_weekly_csv(
    year: Optional[int] = Query(None),
    week: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    machine_id: Optional[int] = Query(None),
    status_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    report = get_weekly_analytics(
        year=year,
        week=week,
        user_id=user_id,
        machine_id=machine_id,
        status_type=status_type,
        db=db,
    )

    output = io.StringIO()
    # BOM UTF-8 pour ouverture directe dans Microsoft Excel avec accents français
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=";")

    writer.writerow(["RAPPORT HEBDOMADAIRE HÉPHAÏSTOS - SENIOR AEROSPACE ERMETO"])
    writer.writerow(["Période", report.week_label])
    writer.writerow(["TRS Disponibilité Global (%)", f"{report.global_kpis['trs_availability_pct']}%"])
    writer.writerow([])

    writer.writerow([
        "ID Déclaration",
        "Date & Heure Début",
        "Date & Heure Fin",
        "Durée (min)",
        "Code Machine",
        "Nom Machine",
        "Secteur / Îlot",
        "Opérateur Nom & Prénom",
        "Identifiant",
        "Statut Déclaré",
        "Motif / Précision",
        "Référence OF",
    ])

    for d in report.declarations:
        writer.writerow([
            d.id,
            d.started_at.strftime("%d/%m/%Y %H:%M:%S"),
            d.ended_at.strftime("%d/%m/%Y %H:%M:%S") if d.ended_at else "En cours",
            round(d.duration_seconds / 60.0, 1),
            d.machine_code,
            d.machine_name,
            d.workshop_sector,
            f"{d.user_last_name.upper()} {d.user_first_name}",
            d.user_username,
            d.status_label,
            d.reason_detail or "-",
            d.order_reference or "-",
        ])

    output.seek(0)
    filename = f"hephaistos_ermeto_S{report.week:02d}_{report.year}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
