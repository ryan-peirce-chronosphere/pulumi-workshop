# Use official Node.js runtime image
FROM node:18

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install --only=prod

# Copy application files
COPY . .

# Expose the port and start the app with auto-instrumentation
CMD ["npm", "start"]
