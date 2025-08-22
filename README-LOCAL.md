# YouTube Note Clipper - Local Version 🏠

A **completely local** web-based tool for taking timestamped notes on YouTube videos with user authentication. **No external services required!**

## 🌟 **Features**

- ✅ **100% Local** - No cloud services, no external databases
- ✅ **User Authentication** - Local user accounts with secure passwords
- ✅ **YouTube Video Notes** - Take timestamped notes on any YouTube video
- ✅ **Offline Capable** - Works without internet connection
- ✅ **SQLite Database** - Lightweight, file-based database
- ✅ **Responsive Design** - Works on desktop and mobile
- ✅ **Collapsible Sidebar** - Clean, organized interface

## 🚀 **Quick Start (Local Only)**

### **Prerequisites**
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### **Installation & Run**

1. **Clone or download the project**
2. **Open terminal in the project folder**
3. **Run the local version:**

```bash
# Option 1: Use the startup script (recommended)
./start-local.sh

# Option 2: Manual commands
npm install
npm run local
```

4. **Open your browser** and go to: `http://localhost:3000`

## 🗄️ **How It Works (Local)**

### **Database**
- **SQLite**: Lightweight, file-based database
- **File Location**: `youtube_notes.db` (created automatically)
- **No Installation**: SQLite runs embedded in the app

### **Storage**
- **All Data**: Stored locally on your machine
- **User Accounts**: Local user database
- **Notes**: Stored in SQLite with video metadata
- **No Cloud**: Nothing leaves your computer

### **Security**
- **JWT Tokens**: Secure authentication (local secret key)
- **Password Hashing**: bcrypt encryption
- **Local Only**: No external authentication services

## 🔧 **Local Configuration**

### **Environment Variables (Optional)**
Create a `.env` file if you want to customize:

```env
PORT=3000
JWT_SECRET=your-custom-secret-key
```

### **Default Settings**
- **Port**: 3000
- **Database**: `youtube_notes.db` (auto-created)
- **JWT Secret**: `local-secret-key` (change for production)

## 📁 **File Structure**

```
youtube_note/
├── server-local.js          # Local server (SQLite)
├── server.js               # MongoDB server (original)
├── public/                 # Frontend files
├── youtube_notes.db        # SQLite database (auto-created)
├── start-local.sh          # Local startup script
└── package.json            # Dependencies
```

## 🆚 **Local vs Cloud Version**

| Feature | Local Version | Cloud Version |
|---------|---------------|---------------|
| **Database** | SQLite (local file) | MongoDB (cloud) |
| **Storage** | Your computer | Cloud servers |
| **Internet** | Not required | Required |
| **Cost** | Free | May have costs |
| **Privacy** | 100% private | Data on servers |
| **Setup** | Simple | More complex |
| **Backup** | Manual | Automatic |

## 🛠️ **Development**

### **Local Development Server**
```bash
npm run dev-local
```

### **Production Local Server**
```bash
npm run local
```

### **Original MongoDB Server**
```bash
npm run dev
```

## 🔒 **Security Notes**

- **Local JWT Secret**: Change the default secret in production
- **Database File**: Keep `youtube_notes.db` secure
- **Port Access**: Only accessible from your machine by default
- **No External Calls**: App doesn't connect to external services

## 🚨 **Troubleshooting**

### **Port Already in Use**
```bash
# Change port in .env file
PORT=3001
```

### **Database Issues**
```bash
# Delete the database file to reset
rm youtube_notes.db
# Restart the server
```

### **Permission Issues**
```bash
# Make startup script executable
chmod +x start-local.sh
```

## 🌐 **Accessing from Other Devices**

To access from other devices on your network:

1. **Find your local IP address**
2. **Update the server to listen on all interfaces**
3. **Access via**: `http://YOUR_IP:3000`

## 📱 **Mobile Access**

- **Same Network**: Access from phone/tablet on same WiFi
- **Responsive Design**: Works on all screen sizes
- **Touch Friendly**: Optimized for mobile devices

## 🎯 **Perfect For**

- **Personal Use**: Keep your notes private
- **Offline Work**: No internet dependency
- **Privacy Focused**: No data leaves your machine
- **Learning**: Understand full-stack development
- **Demo**: Showcase without external dependencies

## 🚀 **Next Steps**

1. **Start the local server**: `./start-local.sh`
2. **Create an account** at `http://localhost:3000`
3. **Load a YouTube video** and start taking notes!
4. **Enjoy your completely local YouTube note-taking app!**

---

**No external services, no cloud dependencies, just you and your notes! 🏠✨**
