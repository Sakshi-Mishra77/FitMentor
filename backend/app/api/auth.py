# app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.schemas.user import UserCreate, UserResponse, Token
from app.core.security import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta, datetime, timezone
import uuid

router = APIRouter()

PASSWORD_REQUIREMENT_MESSAGE = (
    "Password must be at least 8 characters long and include at least one "
    "uppercase letter, one digit, and one special character"
)


def is_valid_password(password: str) -> bool:
    return (
        len(password) >= 8
        and any(char.isupper() for char in password)
        and any(char.isdigit() for char in password)
        and any(not char.isalnum() for char in password)
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db = Depends(get_db)):
    if not is_valid_password(user.password):
        raise HTTPException(status_code=400, detail=PASSWORD_REQUIREMENT_MESSAGE)

    # 1. Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Hash password and generate a unique ID
    hashed_pwd = get_password_hash(user.password)
    user_id = str(uuid.uuid4())
    
    # 3. Create the document format for MongoDB
    user_doc = {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "hashed_password": hashed_pwd,
        "created_at": datetime.now(timezone.utc)
    }
    
    # 4. Insert into the "users" collection
    await db.users.insert_one(user_doc)
    
    return user_doc

@router.post("/login", response_model=Token)
async def login_user(user_credentials: UserCreate, db = Depends(get_db)):
    # 1. Find user by email
    user_doc = await db.users.find_one({"email": user_credentials.email})
    
    # 2. Verify existence and password
    if not user_doc or not verify_password(user_credentials.password, user_doc["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    # 3. Generate JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_doc["id"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
