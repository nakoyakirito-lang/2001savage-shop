# 2001 Savage Shop POS

A lightweight, serverless Point of Sale (POS) and inventory management web application designed for a retail shop. 

## Overview
This system provides an end-to-end shop management solution, originally built with Google Apps Script but now migrated to a standalone Single Page Application (SPA) utilizing **Firebase Realtime Database** as its backend.

## Features
- **Dashboard**: Real-time insights into sales, profits, and low-stock inventory.
- **Admin & Order Management**: View orders, update statuses, print receipts, and manage customer shipments.
- **POS (Point of Sale)**: Simple and intuitive checkout process. Automatically deducts stock from inventory and can send receipts via WhatsApp.
- **Stock Check**: Quickly view current inventory levels across all products.
- **Purchase Orders (Stock In)**: Create purchase orders, receive items, and automatically restock inventory with updated costs.
- **Product Management**: Add new products, including details like cost, price, models, and images.
- **Finance**: Track store expenses and view graphical breakdown reports.

## Technology Stack
- **Frontend**: HTML5, Vanilla JavaScript, CSS3
- **Backend/Database**: Firebase Realtime Database
- **Charting**: Chart.js
- **Icons & Fonts**: Google Material Icons, Noto Sans Lao, Montserrat

## Installation & Setup
Since the app relies solely on frontend files and a Firebase connection, no traditional server environment is needed.

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/nakoyakirito-lang/2001savage-shop.git
   ```
2. **Firebase Configuration**:
   Ensure your Firebase credentials are correct in `firebase-config.js`. 
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     databaseURL: "YOUR_DATABASE_URL",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
     measurementId: "YOUR_MEASUREMENT_ID"
   };
   ```
3. **Run Locally**:
   You can serve the directory using any static file server, for example:
   ```bash
   npx serve .
   ```
   Or simply open the `pos.html` or `admin.html` file in your browser to begin.

## Deployment
Because this is a static web application, it can be easily hosted on platforms like:
- **Firebase Hosting**
- **GitHub Pages**
- **Vercel / Netlify**

*Note: Ensure your Firebase database rules are configured to securely allow read/write access depending on your authentication strategy.*
