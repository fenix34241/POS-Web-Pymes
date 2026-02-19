FROM node:18-alpine

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Ensure data directories exist
RUN mkdir -p /app/data
RUN mkdir -p /app/uploads/products

EXPOSE 3001

CMD ["node", "index.js"]
