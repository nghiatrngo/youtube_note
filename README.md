# YouTube Note Clipper

A web-based tool that lets you load a YouTube video, take timestamped notes, and generate links that start the video at your specified times. Just paste a YouTube URL to get started.

## ✨ Features

- **User Authentication**: Create accounts and log in to save your notes
- **Video Loading**: Paste any YouTube URL to load the video
- **Timestamped Notes**: Create notes with start and end times
- **Clip Generation**: Generate clips with custom time ranges
- **Loop Playback**: Loop specific sections for focused study
- **Note Persistence**: Your notes are saved and synced across devices
- **Responsive Design**: Works on desktop and mobile devices
- **Full-Stack App**: Backend API with MongoDB database

## 🚀 How to Use

1. **Load a Video**: Paste a YouTube URL and click "Load Video"
2. **Set Timestamps**: Use "Set Start" and "Set End" buttons while the video plays
3. **Add Notes**: Write your notes and click "Add Note & Clip"
4. **Navigate**: Click "Go to" to jump to specific timestamps
5. **Loop Sections**: Click "Replay" to loop a specific clip
6. **Manage Notes**: Delete notes you no longer need

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Styling**: Tailwind CSS
- **YouTube API**: YouTube IFrame Player API
- **Responsive Design**: Mobile-first approach with resizable panels

## 🌐 Live Demo

Visit the live application: [YouTube Note Clipper](https://nghiatrngo.github.io/youtube_note/)

**Note**: Repository is public (required for GitHub Pages), but the app is designed for personal use.

## 📱 Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🔧 Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/nghiatrngo/youtube_note.git
   cd youtube_note
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up MongoDB:
   - Install MongoDB locally or use MongoDB Atlas
   - Create a `.env` file based on `env.example`

4. Start the backend server:
   ```bash
   npm run dev
   ```

5. Open your browser to `http://localhost:3000`

6. Create an account and start taking notes on YouTube videos!

## 🚀 Deploy to GitHub Pages

To make your app live on the web:

1. **Enable GitHub Pages:**
   - Go to your repository: https://github.com/nghiatrngo/youtube_note
   - Click "Settings" → "Pages" in the left sidebar
   - Under "Source", select "Deploy from a branch"
   - Choose "master" branch and "/" (root) folder
   - Click "Save"

2. **Wait for deployment** (usually takes a few minutes)

3. **Your app will be live at:** https://nghiatrngo.github.io/youtube_note/

## 📝 Contributing

Contributions are welcome! Here are some ways you can help:

- 🐛 Report bugs
- 💡 Suggest new features
- 🔧 Submit pull requests
- 📖 Improve documentation

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- YouTube IFrame Player API
- Tailwind CSS for styling
- Inter font family from Google Fonts

## 📊 Project Status

- ✅ Core functionality complete
- ✅ Responsive design implemented
- ✅ YouTube API integration working
- 🔄 Future enhancements planned

---

**Made with ❤️ for better note-taking on YouTube**
# Thu Aug 21 22:49:11 PDT 2025
