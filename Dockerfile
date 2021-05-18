# syntax=docker/dockerfile:1
FROM node:12-alpine
ENV NODE_ENV=production
RUN mkdir /auth-microservice
WORKDIR /auth-microservice
COPY package.json .
RUN npm install --production
COPY . .
CMD ["npm", "run", "dev"]
