# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
# Only install production dependencies! This removes typescript and esbuild (which had the vulnerabilities)
COPY package*.json ./
RUN npm ci --omit=dev
# Copy compiled JS from build stage
COPY --from=build /app/dist ./dist
# Copy config or other necessary files if any exist (but dist and node_modules are enough)

EXPOSE 3001
CMD ["npm", "start"]
