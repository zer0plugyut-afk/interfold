FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
COPY abis ./abis
ENV NODE_ENV=production
CMD ["npm", "start"]
