from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import socketio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
#this is file

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security = HTTPBearer()

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    public_key: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    email: str
    public_key: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class MessageCreate(BaseModel):
    receiver_id: str
    encrypted_content: str
    iv: str
    sender_public_key: str

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sender_id: str
    receiver_id: str
    encrypted_content: str
    iv: str
    sender_public_key: str
    timestamp: datetime
    is_delivered: bool = False
    is_read: bool = False

class AuditLogCreate(BaseModel):
    event_type: str
    chat_id: Optional[str] = None
    device_info: Optional[str] = None

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    event_type: str
    chat_id: Optional[str]
    device_info: Optional[str]
    timestamp: datetime

class ContactAdd(BaseModel):
    contact_id: str

class DeleteAccountConfirm(BaseModel):
    password: str
    confirmation_text: str

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

# Root route
@api_router.get("/")
async def api_root():
    return {"message": "SecureChat API", "version": "1.0.0", "status": "operational"}

# Auth routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "public_key": user_data.public_key,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user_id})
    
    user_obj = User(
        id=user_id,
        username=user_data.username,
        email=user_data.email,
        public_key=user_data.public_key,
        created_at=datetime.now(timezone.utc)
    )
    
    return TokenResponse(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    user_obj = User(**{k: v for k, v in user.items() if k != "password_hash"})
    
    return TokenResponse(access_token=access_token, token_type="bearer", user=user_obj)

# User routes
@api_router.get("/users/search", response_model=List[User])
async def search_users(q: str, current_user: User = Depends(get_current_user)):
    if len(q) < 2:
        return []
    
    users = await db.users.find(
        {
            "$or": [
                {"username": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}}
            ],
            "id": {"$ne": current_user.id}
        },
        {"_id": 0, "password_hash": 0}
    ).to_list(20)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return [User(**user) for user in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

@api_router.delete("/users/me")
async def delete_account(delete_data: DeleteAccountConfirm, current_user: User = Depends(get_current_user)):
    """
    Delete user account and all associated data.
    Requires password confirmation and typing 'DELETE' for safety.
    """
    # Verify password
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    if not user or not verify_password(delete_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Verify confirmation text
    if delete_data.confirmation_text != "DELETE":
        raise HTTPException(status_code=400, detail="Confirmation text must be 'DELETE'")
    
    # Delete all user data
    try:
        # 1. Delete all messages sent by user
        await db.messages.delete_many({"sender_id": current_user.id})
        
        # 2. Delete all messages received by user
        await db.messages.delete_many({"receiver_id": current_user.id})
        
        # 3. Delete user's contacts
        await db.contacts.delete_many({"user_id": current_user.id})
        
        # 4. Delete user from other users' contact lists
        await db.contacts.delete_many({"contact_id": current_user.id})
        
        # 5. Delete audit logs
        await db.audit_logs.delete_many({"user_id": current_user.id})
        
        # 6. Finally, delete the user account
        await db.users.delete_one({"id": current_user.id})
        
        # Log the deletion event
        logging.info(f"User account deleted: {current_user.id} ({current_user.email})")
        
        return {
            "message": "Account successfully deleted",
            "deleted_user_id": current_user.id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logging.error(f"Error deleting account: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account")

# Message routes
@api_router.post("/messages", response_model=Message)
async def send_message(message_data: MessageCreate, current_user: User = Depends(get_current_user)):
    message_id = str(uuid.uuid4())
    message_dict = {
        "id": message_id,
        "sender_id": current_user.id,
        "receiver_id": message_data.receiver_id,
        "encrypted_content": message_data.encrypted_content,
        "iv": message_data.iv,
        "sender_public_key": message_data.sender_public_key,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_delivered": False,
        "is_read": False
    }
    
    await db.messages.insert_one(message_dict)
    
    message_obj = Message(
        id=message_id,
        sender_id=current_user.id,
        receiver_id=message_data.receiver_id,
        encrypted_content=message_data.encrypted_content,
        iv=message_data.iv,
        sender_public_key=message_data.sender_public_key,
        timestamp=datetime.now(timezone.utc),
        is_delivered=False,
        is_read=False
    )
    
    # Emit via socket
    await sio.emit('new_message', message_obj.model_dump(mode='json'), room=message_data.receiver_id)
    
    return message_obj

@api_router.get("/messages/{other_user_id}", response_model=List[Message])
async def get_messages(other_user_id: str, current_user: User = Depends(get_current_user)):
    messages = await db.messages.find(
        {
            "$or": [
                {"sender_id": current_user.id, "receiver_id": other_user_id},
                {"sender_id": other_user_id, "receiver_id": current_user.id}
            ]
        },
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    for msg in messages:
        if isinstance(msg.get('timestamp'), str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    
    return [Message(**msg) for msg in messages]

# Audit logs
@api_router.post("/audit-logs", response_model=AuditLog)
async def create_audit_log(log_data: AuditLogCreate, current_user: User = Depends(get_current_user)):
    log_id = str(uuid.uuid4())
    log_dict = {
        "id": log_id,
        "user_id": current_user.id,
        "event_type": log_data.event_type,
        "chat_id": log_data.chat_id,
        "device_info": log_data.device_info,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.audit_logs.insert_one(log_dict)
    
    return AuditLog(
        id=log_id,
        user_id=current_user.id,
        event_type=log_data.event_type,
        chat_id=log_data.chat_id,
        device_info=log_data.device_info,
        timestamp=datetime.now(timezone.utc)
    )

@api_router.get("/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(current_user: User = Depends(get_current_user)):
    logs = await db.audit_logs.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    
    return [AuditLog(**log) for log in logs]

# Contacts
@api_router.post("/contacts")
async def add_contact(contact_data: ContactAdd, current_user: User = Depends(get_current_user)):
    existing = await db.contacts.find_one({
        "user_id": current_user.id,
        "contact_id": contact_data.contact_id
    })
    
    if existing:
        return {"message": "Contact already exists"}
    
    await db.contacts.insert_one({
        "user_id": current_user.id,
        "contact_id": contact_data.contact_id,
        "added_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Contact added successfully"}

@api_router.get("/contacts", response_model=List[User])
async def get_contacts(current_user: User = Depends(get_current_user)):
    contacts = await db.contacts.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).to_list(1000)
    
    contact_ids = [c["contact_id"] for c in contacts]
    
    if not contact_ids:
        return []
    
    users = await db.users.find(
        {"id": {"$in": contact_ids}},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return [User(**user) for user in users]

# Socket.IO events
@sio.event
async def connect(sid, environ, auth):
    if auth and 'token' in auth:
        try:
            payload = jwt.decode(auth['token'], SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get('sub')
            await sio.enter_room(sid, user_id)
            await sio.emit('connected', {'status': 'success'}, room=sid)
            logging.info(f"User {user_id} connected with sid {sid}")
        except jwt.PyJWTError:
            await sio.emit('error', {'message': 'Invalid token'}, room=sid)
            return False
    return True

@sio.event
async def disconnect(sid):
    logging.info(f"Client {sid} disconnected")

@sio.event
async def typing(sid, data):
    receiver_id = data.get('receiver_id')
    if receiver_id:
        await sio.emit('user_typing', {'sender_id': data.get('sender_id')}, room=receiver_id)

# Include router
app.include_router(api_router)

# Wrap Socket.IO with ASGI
socket_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8001)