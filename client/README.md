# Frontend (Client)

## Technologies Used

- React.js
- MobX for state management
- React Router for navigation
- Axios for API requests
- JWT for authentication

## Features

- **User Authentication**: Login and registration with JWT
- **Chat Interface**: Real-time conversation with AI assistant
- **Admin Panel**: FAQ management for administrators
- **PDF Upload**: Extract FAQs from PDF documents
- **System Prompt**: Customize AI assistant personality (admin only)
- **Chat History**: Download conversation history
- **Responsive Design**: Works on mobile and desktop devices

## Login Credentials

- **For user** : **username** : testuser, **password** : password123

- **For admin** : **username** : admin, **password** : admin123

## Setup and Installation

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   REACT_APP_API_URL=https://expense-tracker-backend-944r.onrender.com/api
   # For local development:
   # REACT_APP_API_URL=http://localhost:5000/api
   ```

4. Start the development server
   ```bash
   npm start
   # or
   yarn start
   ```

## Deployment

The frontend can be deployed to Netlify or any other static hosting service. For Netlify deployment, make sure to add the following redirect rule:

## License

This project is licensed under the MIT License.
