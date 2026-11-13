from typing import Literal, Optional, List
from pydantic import BaseModel

TrackStatus = Literal["pending", "in_transit", "received_cargo", "issued"]


class LoginData(BaseModel):
    username: str
    password: str


class SetupAdmin(BaseModel):
    name: str
    username: str
    password: str


class PasswordChangeSelf(BaseModel):
    old_password: str
    new_password: str


class PasswordChangeAdmin(BaseModel):
    new_password: str


class ParcelCreate(BaseModel):
    name: str


class RecipientCreate(BaseModel):
    name: str
    username: str
    password: str


class Allocation(BaseModel):
    recipient_name: str
    quantity: int


class TrackUpsert(BaseModel):
    barcode: Optional[str] = None
    attachment: str
    parcel_id: Optional[int] = None
    allocations: List[Allocation]
    unit: Optional[str] = None
    price: Optional[float] = None
    weight_g: Optional[int] = None
    comment: Optional[str] = None
    url: Optional[str] = None
    order_id: Optional[int] = None  # НОВОЕ ПОЛЕ


class TrackUpdate(BaseModel):
    barcode: Optional[str] = None
    attachment: Optional[str] = None
    parcel_id: Optional[int] = None
    allocations: Optional[List[Allocation]] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    weight_g: Optional[int] = None
    comment: Optional[str] = None
    url: Optional[str] = None
    status: Optional[TrackStatus] = None


class WeightUpdate(BaseModel):
    weight_g: int


class OrderCreate(BaseModel):
    title: str
    url: str
    description: Optional[str] = None
    quantity: int = 1


class OrderUpdateAdmin(BaseModel):
    status: Optional[str] = None
    admin_comment: Optional[str] = None
