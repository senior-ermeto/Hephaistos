from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    OPERATOR = "OPERATOR"


class DeclarationStatus(str, enum.Enum):
    PRODUCTION = "PRODUCTION"
    PAUSE = "PAUSE"
    STOP_TOOL_CHANGE = "STOP_TOOL_CHANGE"
    STOP_WAITING = "STOP_WAITING"
    STOP_BREAKDOWN = "STOP_BREAKDOWN"
    STOP_OTHER = "STOP_OTHER"


STATUS_LABELS_FR = {
    DeclarationStatus.PRODUCTION.value: "Production",
    DeclarationStatus.PAUSE.value: "Pause",
    DeclarationStatus.STOP_TOOL_CHANGE.value: "Arrêt : Changement d'outil",
    DeclarationStatus.STOP_WAITING.value: "Arrêt : Attentes",
    DeclarationStatus.STOP_BREAKDOWN.value: "Arrêt : Panne",
    DeclarationStatus.STOP_OTHER.value: "Arrêt : Autres arrêts",
}


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    pin_code = Column(String(16), nullable=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    badge_code = Column(String(64), unique=True, nullable=True, index=True)
    role = Column(String(32), default=UserRole.OPERATOR.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    declarations = relationship(
        "MachineDeclaration",
        back_populates="user",
        foreign_keys="MachineDeclaration.user_id",
    )


class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    workshop_sector = Column(String(120), default="Atelier Principal", nullable=False)
    description = Column(Text, nullable=True)

    current_status = Column(
        String(40),
        default=DeclarationStatus.PAUSE.value,
        nullable=False,
    )
    current_reason = Column(Text, nullable=True)
    current_order_reference = Column(String(64), nullable=True)
    current_operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status_updated_at = Column(DateTime, default=utc_now, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    current_operator = relationship("User", foreign_keys=[current_operator_id])
    declarations = relationship(
        "MachineDeclaration",
        back_populates="machine",
        cascade="all, delete-orphan",
    )


class MachineDeclaration(Base):
    __tablename__ = "machine_declarations"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(
        Integer, ForeignKey("machines.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=False
    )
    status_type = Column(String(40), index=True, nullable=False)
    reason_detail = Column(Text, nullable=True)
    order_reference = Column(String(64), nullable=True)

    started_at = Column(DateTime, default=utc_now, index=True, nullable=False)
    ended_at = Column(DateTime, nullable=True, index=True)
    duration_seconds = Column(Integer, nullable=True)

    machine = relationship("Machine", back_populates="declarations")
    user = relationship("User", back_populates="declarations", foreign_keys=[user_id])


class OperatorShift(Base):
    __tablename__ = "operator_shifts"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="SET NULL"), index=True, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    previous_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(40), default="OPERATOR_CHANGE", nullable=False)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=utc_now, index=True, nullable=False)

    machine = relationship("Machine", foreign_keys=[machine_id])
    user = relationship("User", foreign_keys=[user_id])
    previous_user = relationship("User", foreign_keys=[previous_user_id])
