# Use an official Node runtime as a parent image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the app
RUN npm run build

# Expose port 8080
EXPOSE 8080

# Define the command to run the app
CMD ["npm", "start"]
