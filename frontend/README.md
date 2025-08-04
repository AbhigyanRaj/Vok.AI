# Vok.AI Frontend

**React-based frontend for Vok.AI voice automation platform**

> **Status: Under Development** 🚧  
> Built with ❤️ by [Abhigyan](https://github.com/AbhigyanRaj) | IIIT Delhi

---

## 🎯 Overview

This is the frontend application for Vok.AI, a voice automation platform that enables businesses to create custom call scripts and manage outbound calling campaigns. The frontend is built with modern React technologies and provides an intuitive interface for module management and call analytics.

## 🚧 Development Status

### ✅ Completed Features
- [x] Responsive UI design with Tailwind CSS
- [x] Module creation and management interface
- [x] User authentication with Google OAuth
- [x] Token-based billing system UI
- [x] Real-time module editing capabilities
- [x] Drag-and-drop question reordering

### 🔄 In Progress
- [ ] Backend API integration (Node.js + Express)
- [ ] Real-time call status updates
- [ ] Analytics dashboard implementation
- [ ] Voice call initiation interface

### 📋 Planned Features
- [ ] Call history visualization
- [ ] Real-time transcription display
- [ ] AI-powered insights dashboard
- [ ] Advanced analytics charts

## 🛠️ Tech Stack

- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Lucide React** - Icon library
- **React Icons** - Additional icons

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/AbhigyanRaj/Vok.AI.git
cd Vok.AI/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
frontend/
├── public/                    # Static assets
│   ├── vokai-favicon.svg    # App logo
│   └── vite.svg             # Vite logo
├── src/
│   ├── components/           # React components
│   │   ├── ui/              # Reusable UI components
│   │   ├── Hero.tsx         # Landing page
│   │   ├── ModulesPage.tsx  # Module management
│   │   ├── AnalyticsPage.tsx # Analytics dashboard
│   │   └── CreateModule.tsx # Module creation
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx  # Authentication state
│   ├── lib/                 # Utilities
│   │   ├── firebase.ts      # Firebase integration
│   │   └── utils.ts         # Helper functions
│   ├── App.tsx              # Main app component
│   └── main.tsx             # App entry point
├── package.json             # Dependencies
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### Backend Integration
> **Note**: The backend is currently under development. The frontend is designed to integrate with a Node.js + Express backend with MongoDB database.

## 🎨 UI Components

The application uses a custom design system built with:
- **Tailwind CSS** for styling
- **Custom UI components** for consistency
- **Responsive design** for all screen sizes
- **Dark theme** with modern aesthetics

## 🚀 Key Features

### Module Management
- Create custom voice modules with multiple questions
- Real-time editing and reordering
- Drag-and-drop interface
- Question validation and management

### User Authentication
- Google OAuth integration
- Protected routes
- User profile management
- Token balance tracking

### Token System
- Visual token balance display
- Purchase interface for different plans
- Usage tracking and analytics

## 🔗 API Integration

The frontend is designed to work with the following backend endpoints:

- `POST /api/auth/google` - Google OAuth
- `GET /api/modules` - Fetch user modules
- `POST /api/modules` - Create new module
- `PUT /api/modules/:id` - Update module
- `DELETE /api/modules/:id` - Delete module
- `POST /api/calls/initiate` - Start voice call
- `GET /api/calls/history` - Call history

## 🤝 Contributing

This project is under active development. For questions or collaboration, please reach out to [Abhigyan](https://github.com/AbhigyanRaj).

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">
  <em>Built with modern React technologies for the future of voice automation.</em>
</p>
