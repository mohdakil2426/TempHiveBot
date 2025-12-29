FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables (Should be overridden by provider)
ENV PYTHONUNBUFFERED=1

# Run the bot
CMD ["python", "-m", "bot.main"]
