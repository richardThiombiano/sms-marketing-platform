FROM python:3.12-bookworm

WORKDIR /app

COPY pyproject.toml ./

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    "fastapi==0.115.0" \
    "uvicorn[standard]" \
    "sqlalchemy[asyncio]==2.0.35" \
    "asyncpg==0.29.0" \
    "alembic==1.13.2" \
    "pydantic[email]==2.9.2" \
    "pydantic-settings==2.5.2" \
    "python-jose[cryptography]==3.3.0" \
    "passlib[bcrypt]==1.7.4" \
    "python-multipart==0.0.9" \
    "boto3==1.35.19" \
    "redis==5.1.0" \
    "httpx==0.27.2" \
    "phonenumbers==8.13.45" \
    "mangum==0.18.0" \
    "psycopg2-binary" \
    "bcrypt==4.0.1" \
    "openpyxl"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
