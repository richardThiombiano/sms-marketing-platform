import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ============================================
# AUTH SCHEMAS
# ============================================

class RegisterRequest(BaseModel):
    """Formulaire d'inscription self-service."""
    company_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: str = Field(..., min_length=8, max_length=20)
    username: str = Field(..., min_length=3, max_length=30)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8)
    sender_id: str = Field(..., min_length=3, max_length=11)  # Sender ID souhaité (max 11 chars alphanum)


class LoginRequest(BaseModel):
    identifier: str  # Email ou username
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ============================================
# USER SCHEMAS
# ============================================

class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    first_name: str | None
    last_name: str | None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# CONTACT SCHEMAS
# ============================================

class ContactCreate(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    email: EmailStr | None = None
    birth_date: datetime | None = None
    gender: str | None = None
    city: str | None = None
    country: str | None = None
    tags: list[str] = []
    metadata: dict = {}


class ContactUpdate(BaseModel):
    phone: str | None = Field(None, min_length=8, max_length=20)
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    birth_date: datetime | None = None
    gender: str | None = None
    city: str | None = None
    country: str | None = None
    tags: list[str] | None = None
    metadata: dict | None = None


class ContactResponse(BaseModel):
    id: uuid.UUID
    phone: str
    first_name: str | None
    last_name: str | None
    email: str | None
    birth_date: datetime | None
    gender: str | None
    city: str | None
    country: str | None
    tags: list[str]
    is_subscribed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# TEMPLATE SCHEMAS
# ============================================

class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    category: str | None = None
    variables: list[str] = []


class TemplateUpdate(BaseModel):
    name: str | None = None
    content: str | None = None
    category: str | None = None
    variables: list[str] | None = None


class TemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    content: str
    category: str | None
    variables: list[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# CAMPAIGN SCHEMAS
# ============================================

class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    type: str = Field(..., pattern="^(marketing|transactional|promotional|birthday|reminder)$")
    template_id: uuid.UUID | None = None
    target_group_id: uuid.UUID | None = None
    target_filters: dict | None = None
    scheduled_at: datetime | None = None
    is_ab_test: bool = False
    variant_a: str | None = None
    variant_b: str | None = None


class CampaignResponse(BaseModel):
    id: uuid.UUID
    name: str
    content: str
    type: str
    status: str
    target_group_id: uuid.UUID | None
    scheduled_at: datetime | None
    sent_at: datetime | None
    total_recipients: int
    total_sent: int
    total_delivered: int
    total_failed: int
    total_clicked: int
    is_ab_test: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# SMS DIRECT SCHEMAS
# ============================================

class SmsSendRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)
    content: str = Field(..., min_length=1, max_length=1600)
    type: str = Field(default="transactional", pattern="^(marketing|transactional|promotional|birthday|reminder)$")


class SmsBulkRequest(BaseModel):
    phones: list[str] = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1, max_length=1600)
    type: str = Field(default="marketing", pattern="^(marketing|transactional|promotional|birthday|reminder)$")


class SmsResponse(BaseModel):
    message_id: uuid.UUID
    phone: str
    status: str
    credits_used: int


# ============================================
# GROUP SCHEMAS
# ============================================

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    is_dynamic: bool = False
    filters: dict | None = None


class GroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    is_dynamic: bool
    contact_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# PAGINATION
# ============================================

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int
