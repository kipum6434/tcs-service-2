FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
CMD ["node", ".next/standalone/server.js"]