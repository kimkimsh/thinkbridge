FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Render는 $PORT 환경변수로 포트를 지정함 (기본 10000)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
