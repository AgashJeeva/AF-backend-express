# Step 1: Use an official Node.js environment as the base image
FROM node:20-alpine

# Step 2: Set the working directory inside the container
WORKDIR /usr/src/app

# Step 3: Copy package.json and package-lock.json first.
# This allows Docker to cache the 'npm install' step if dependencies haven't changed.
COPY package*.json ./

# Step 4: Install dependencies (production only to keep the image small)
RUN npm ci --only=production

# Step 5: Copy the rest of the project files
COPY . .

# Step 6: Expose port 5000 (which is the port the backend runs on)
EXPOSE 5000

# Step 7: Define the command to run the application
CMD ["node", "index.js"]
