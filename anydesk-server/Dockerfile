FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the TypeScript project
RUN npm run build

# Expose the API and Socket.io port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
