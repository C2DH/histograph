# 1. Build Webapp
FROM node:10-alpine as webapp_builder

RUN apk add --no-cache git

WORKDIR /webapp
COPY client/package.json /webapp
RUN npm install

COPY client /webapp
RUN npm run build

# 2. Build API and copy webapp assets
FROM node:10-alpine

WORKDIR /histograph

COPY ./package.json .
COPY ./package-lock.json .
RUN npm install --production

COPY . .
RUN mkdir logs

COPY --from=webapp_builder /webapp/dist client/dist
