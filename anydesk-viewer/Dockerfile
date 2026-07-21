# Stage 1: Build the React application
FROM node:20-alpine as build

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
RUN npm ci

# Copy the source code
COPY . .

# Accept signaling URL as a build argument
ARG VITE_SIGNALING_URL
ENV VITE_SIGNALING_URL=$VITE_SIGNALING_URL

# Build the Vite project
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the built assets from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Create a custom Nginx configuration to support client-side routing (React Router)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Enable gzip compression for better performance \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
