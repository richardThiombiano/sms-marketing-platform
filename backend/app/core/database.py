from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# Configuration adaptative du pool selon l'environnement
if settings.environment == "production":
    # Lambda : pool minimal, connexions courtes via RDS Proxy
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_size=1,
        max_overflow=2,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_timeout=10,
        connect_args={
            "server_settings": {"application_name": "sms-marketing-lambda"},
            "command_timeout": 25,
        },
    )
else:
    # Local / dev : pool classique pour uvicorn
    engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
    )

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
