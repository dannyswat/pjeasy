# Stage 1: Build frontend
FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies first (better caching)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM --platform=$BUILDPLATFORM golang:1.24-alpine AS backend-builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /app/backend

# Download Go dependencies first (better caching)
COPY backend/go.mod backend/go.sum ./

RUN go mod download

# Copy backend source and build
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /app/pjeasy ./cmd/api

# Stage 3: Runtime
FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy the compiled binary
COPY --from=backend-builder /app/pjeasy ./pjeasy

# Copy frontend build output
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create uploads directory
RUN mkdir -p uploads/images

# Copy default config (with frontendDir set for Docker)
COPY config.docker.json ./config.json

EXPOSE 8080

ENTRYPOINT ["./pjeasy"]
CMD ["-config", "config.json"]
