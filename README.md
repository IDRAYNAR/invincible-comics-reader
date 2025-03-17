# ⚠️ Disclaimer

This project is **not designed for public use**. It was built specifically to meet a **personal need** and is tailored to the architecture of my drive.

You are free to explore, modify, and adapt it to your own use, but keep in mind that the setup and structure may **not be directly compatible** with your environment.

Feel free to experiment, but **adjustments will likely be necessary** to make it work for your specific setup.

# 📁 Google Drive Architecture

This application is designed to work with the following folder structure:

```
My Drive
└── Invincible/
    ├── Invincible - 01 - Family Matter/
    │   ├── 0001_0000.jpg
    │   ├── 0002_0001.jpg
    │   └── ...
    ├── Invincible - 02 - Eight Is Enough/
    │   ├── 0001_0000.jpg
    │   ├── 0002_0001.jpg
    │   └── ...
    └── ...
```

The application navigates through this hierarchical structure and displays the images in numerical order for each volume.

# 🦸‍♂️ Invincible Comics Reader

A Next.js application for reading comics stored on Google Drive.

## ✨ Features

- 🔐 Authentication with Google OAuth
- 📂 Access to Google Drive files
- 📖 Integrated comics reader
- 📱 Responsive interface

## 🚀 Local Setup

1. Clone the repository
   ```bash
   git clone https://github.com/your-username/invincible-comics-reader.git
   cd invincible-comics-reader
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env.local` file at the root of the project with the following variables:
   ```
   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret_here

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

## 🔒 Security

- 🔑 Sensitive environment variables are stored in `.env.local` which is ignored by Git
- 🛡️ Authentication is managed by NextAuth.js
- 🔐 Access tokens are securely stored in JWT sessions

## 📝 License

MIT
