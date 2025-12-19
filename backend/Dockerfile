# Use latest LTS Node 24 for security & features
FROM node:24-bookworm

ENV NODE_ENV=production
WORKDIR /app

# Install deps in a clean layer
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy app sources
COPY . .

EXPOSE 4000
CMD ["npm","start"]
