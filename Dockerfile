# ============================================================
# Multi-stage Dockerfile for Cylinder Distribution Platform
# Stage 1: builder — install all deps including dev
# Stage 2: production — copy only what's needed
# ============================================================

# ---------- Stage 1: Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including devDeps for potential build steps)
RUN npm ci --include=dev

# Copy source
COPY . .

# ---------- Stage 2: Production ----------
FROM node:20-alpine AS production

# Set environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 appuser

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy source from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts

# Create logs directory and set permissions
RUN mkdir -p logs && chown -R appuser:nodejs /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "src/server.js"]
