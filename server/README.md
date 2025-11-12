# Backend (Server)

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcrypt for password hashing
- PDF parsing capabilities

# Features

- **User Authentication**: Secure login and registration
- **Chat API**: Process and store chat messages
- **FAQ Management**: CRUD operations for FAQs
- **PDF Processing**: Extract FAQs from uploaded PDFs
- **Chat History**: Store and retrieve user conversations
- **System Prompt**: Store and retrieve AI personality settings

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
  
## Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd financial-management-backend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=<your-mongodb-connection-string>
   JWT_SECRET=<your-jwt-secret>
   NODE_ENV=development
   AZURE_OPENAI_API_KEY=<your_API_Key>
   AZURE_OPENAI_ENDPOINT=<your_Endpoint>
   AZURE_OPENAI_DEPLOYMENT=<your_Deployment_Name>
   ```

4. Start the server
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## API Endpoints

## Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user

## Chat

- `GET /api/chat/history` - Get chat history for current user
- `POST /api/chat/message` - Send a message and get AI response
- `GET /api/chat/download` - Download chat history
- `POST /api/chat/system-prompt` - Update system prompt (admin only)

## FAQ Management

- `GET /api/faq` - Get all FAQs
- `POST /api/faq` - Add a new FAQ
- `DELETE /api/faq/:id` - Delete an FAQ
- `POST /api/faq/upload` - Upload and process a PDF
- `POST /api/faq/bulk` - Add multiple FAQs at once

## User Roles
- **Regular User**: Can chat with the AI assistant and view their chat history
- **Admin**: Can manage FAQs, upload PDFs, customize the system prompt, and access all user features

## License

This project is licensed under the MIT License - see the LICENSE file for details.
