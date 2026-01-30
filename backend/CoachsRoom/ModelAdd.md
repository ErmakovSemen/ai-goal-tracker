Код моделей (SQLAlchemy, пример)

# app/models/trainer_profile.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.database import Base

class TrainerProfile(Base):
    __tablename__ = "trainer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)

    behavior_json = Column(JSONB, nullable=False)
    phrases_json = Column(JSONB, nullable=False)
    prompt_rules_json = Column(JSONB, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    assets = relationship("TrainerAsset", back_populates="trainer")


# app/models/trainer_gender.py
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.database import Base

class TrainerGender(Base):
    __tablename__ = "trainer_genders"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)  # male/female
    name = Column(String, nullable=False)

    pronouns_json = Column(JSONB, nullable=False)
    forms_json = Column(JSONB, nullable=False)
    prompt_hint = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    assets = relationship("TrainerAsset", back_populates="gender")


# app/models/trainer_asset.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.database import Base

class TrainerAsset(Base):
    __tablename__ = "trainer_assets"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("trainer_profiles.id"), nullable=False)
    gender_id = Column(Integer, ForeignKey("trainer_genders.id"), nullable=False)

    asset_type = Column(String, nullable=False)  # image / rig
    format = Column(String, nullable=False)      # png / webp / spine / ...
    url = Column(String, nullable=False)

    meta_json = Column(JSONB, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    trainer = relationship("TrainerProfile", back_populates="assets")
    gender = relationship("TrainerGender", back_populates="assets")

Рекомендации по внедрению
1) Размещение файлов моделей
app/models/trainer_profile.py
app/models/trainer_gender.py
app/models/trainer_asset.py
2) Импорт в app/models/__init__.py
Чтобы SQLAlchemy видел модели при миграциях.
3) Связи
TrainerProfile.assets ↔ TrainerAsset.trainer
TrainerGender.assets ↔ TrainerAsset.gender
4) Связь Goal с тренером (в существующей модели Goal)
goal.trainer_id → FK на trainer_profiles
5) Добавить сиды / базовые записи
3 тренера
2 гендера
базовые ассеты (PNG)

# app/models/trainer_profile.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.database import Base

class TrainerProfile(Base):
    __tablename__ = "trainer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)

    behavior_json = Column(JSONB, nullable=False)
    phrases_json = Column(JSONB, nullable=False)
    prompt_rules_json = Column(JSONB, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    assets = relationship("TrainerAsset", back_populates="trainer")

    # app/models/trainer_gender.py
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.database import Base

class TrainerGender(Base):
    __tablename__ = "trainer_genders"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)  # male / female
    name = Column(String, nullable=False)

    pronouns_json = Column(JSONB, nullable=False)
    forms_json = Column(JSONB, nullable=False)
    prompt_hint = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    assets = relationship("TrainerAsset", back_populates="gender")


# app/models/trainer_asset.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database.database import Base

class TrainerAsset(Base):
    __tablename__ = "trainer_assets"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("trainer_profiles.id"), nullable=False)
    gender_id = Column(Integer, ForeignKey("trainer_genders.id"), nullable=False)

    asset_type = Column(String, nullable=False)  # image / rig
    format = Column(String, nullable=False)      # png / webp / spine / ...
    url = Column(String, nullable=False)

    meta_json = Column(JSONB, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    trainer = relationship("TrainerProfile", back_populates="assets")
    gender = relationship("TrainerGender", back_populates="assets")

    