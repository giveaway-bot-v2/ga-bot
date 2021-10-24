# NodeJS 16.6.0 is the minimum requirement of Discord.js
FROM node:16.6

# Create the main working directory
WORKDIR /bot

# Copy over both package.json and package-lock.json and install dependencies
COPY package*.json ./

RUN npm install

# The order is important here, by only copying in source code after installing
# dependencies the Dockerfile can be cached up until this point
COPY . .

# Build the TypeScript project
RUN npx tsc

# Difference between CMD and RUN is that CMD marks the default command to run
# when the Dockerfile is starting
CMD ["npm", "start"]
