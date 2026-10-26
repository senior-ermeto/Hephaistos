from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, ConfigDict, Field


# ==============================================================================
# AUTH SCHEMAS
# ==============================================================================
class LoginRequest(BaseModel):
    username: str
    password: str


class OperatorLoginRequest(BaseModel):
    user_id: Optional[int] = None
    pin_code: Optional[str] = None
    badge_code: Optional[str] = None
    machine_id: Optional[int] = None


class UserSummary(BaseModel):
    id: int
    username: str
    first_name: str
    last_name: str
    role: str
    badge_code: Optional[str] = None
    pin_code: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSummary


# ==============================================================================
# USER SCHEMAS
# ==============================================================================
class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=64)
    password: str = Field(..., min_length=3, max_length=128)
    pin_code: Optional[str] = Field(default="0000", max_length=16)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    badge_code: Optional[str] = None
    role: str = "OPERATOR"
    is_active: bool = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    pin_code: Optional[str] = None
    badge_code: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# ==============================================================================
# MACHINE SCHEMAS
# ==============================================================================
class MachineCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=64)
    name: str = Field(..., min_length=2, max_length=150)
    workshop_sector: str = Field(default="Atelier Principal", max_length=120)
    description: Optional[str] = None


class MachineUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    workshop_sector: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class MachineOut(BaseModel):
    id: int
    code: str
    name: str
    workshop_sector: str
    description: Optional[str] = None
    current_status: str
    current_reason: Optional[str] = None
    current_order_reference: Optional[str] = None
    current_operator_id: Optional[int] = None
    current_operator: Optional[UserSummary] = None
    status_updated_at: datetime
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# DECLARATION & OPERATOR CHANGE SCHEMAS
# ==============================================================================
class DeclarationCreate(BaseModel):
    machine_id: int
    user_id: int
    status_type: str  # PRODUCTION, PAUSE, STOP_TOOL_CHANGE, STOP_WAITING, STOP_BREAKDOWN, STOP_OTHER
    reason_detail: Optional[str] = None
    order_reference: Optional[str] = None


class OperatorChangeCreate(BaseModel):
    user_id: int
    previous_user_id: Optional[int] = None
    machine_id: Optional[int] = None
    pin_code: Optional[str] = None
    notes: Optional[str] = None


class DeclarationOut(BaseModel):
    id: int
    machine_id: int
    machine_code: str
    machine_name: str
    workshop_sector: str
    user_id: int
    user_first_name: str
    user_last_name: str
    user_username: str
    status_type: str
    status_label: str
    reason_detail: Optional[str] = None
    order_reference: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: int
    is_ongoing: bool = False


class OperatorShiftOut(BaseModel):
    id: int
    machine_id: Optional[int] = None
    machine_code: Optional[str] = None
    machine_name: Optional[str] = None
    user_id: int
    user_first_name: str
    user_last_name: str
    previous_user_id: Optional[int] = None
    previous_user_name: Optional[str] = None
    action_type: str
    notes: Optional[str] = None
    timestamp: datetime


# ==============================================================================
# WEEKLY ANALYTICS & TABLE SCHEMAS
# ==============================================================================
class DailyMachineCell(BaseModel):
    date: str  # YYYY-MM-DD
    day_label: str  # Lundi, Mardi...
    durations_by_status: Dict[str, int]  # seconds per status
    total_tracked_seconds: int
    production_seconds: int
    downtime_seconds: int
    pause_seconds: int
    trs_availability_pct: float
    declarations_count: int
    dominant_status: Optional[str] = None
    last_operator_name: Optional[str] = None


class MachineWeeklyRow(BaseModel):
    machine_id: int
    machine_code: str
    machine_name: str
    workshop_sector: str
    current_status: str
    current_operator_name: Optional[str] = None
    days: List[DailyMachineCell]
    weekly_totals_by_status: Dict[str, int]
    weekly_production_seconds: int
    weekly_downtime_seconds: int
    weekly_pause_seconds: int
    weekly_total_seconds: int
    weekly_trs_pct: float
    weekly_declarations_count: int


class WeeklyAnalyticsResponse(BaseModel):
    year: int
    week: int
    week_start_date: str
    week_end_date: str
    week_label: str
    global_kpis: Dict[str, float | int]
    machine_rows: List[MachineWeeklyRow]
    declarations: List[DeclarationOut]
    operator_shifts: List[OperatorShiftOut]
