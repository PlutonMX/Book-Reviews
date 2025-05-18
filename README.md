██████╗  ██████╗  ██████╗ ██╗  ██╗███████╗███████╗██╗    ██╗███████╗███████╗
██╔══██╗██╔═══██╗██╔════╝ ██║ ██╔╝██╔════╝██╔════╝██║    ██║██╔════╝██╔════╝
██████╔╝██║   ██║██║  ███╗█████╔╝ █████╗  ███████╗██║ █╗ ██║█████╗  ███████╗
██╔═══╝ ██║   ██║██║   ██║██╔═██╗ ██╔══╝  ╚════██║██║███╗██║██╔══╝  ╚════██║
██║     ╚██████╔╝╚██████╔╝██║  ██╗███████╗███████║╚███╔███╔╝███████╗███████║
╚═╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝ ╚══╝╚══╝ ╚══════╝╚══════╝

# 📚 Book Reviews

**Book Reviews** is a web application for viewing and managing book reviews.  
Visitors can read reviews written by the author (Juan Luis), and an admin login allows access to add, edit, or delete reviews via a protected route.

---

## 🌍 Live Demo

[🔗 View on Render](https://your-render-link.com) <!-- Replace with actual link -->

---

## ✨ Features

- View a list of book reviews

- Admin login with username/password from a PostgreSQL database

- Add, edit or delete reviews (admin only)

- TailwindCSS for modern responsive design

- Cookie handling for session tracking

- Secure password check (recommend hashing it!)


---

## 🧰 Tech Stack

- Node.js

- Express.js

- PostgreSQL

- EJS

- TailwindCSS

- Body-parser

- Cookie-parser

---

## 🛠️ Local Setup

``
git clone https://github.com/your-username/book-reviews.git

cd book-reviews

npm install

node server.js

Make sure PostgreSQL is running and configured properly. Update database credentials in your .env or connection settings.

📂 Project Structure


📦 book-reviews/

 ┣ 📂 dist/

 ┃ ┗ 📄 output.css

 ┣ 📂 public/

 ┃ ┗ 📄 styles.css

 ┣ 📂 src/

 ┃ ┗ 📄 input.css

 ┣ 📂 views/

 ┃ ┣ 📂 partials/

 ┃ ┃ ┣ 📄 head.ejs

 ┃ ┃ ┗ 📄 ...

 ┃ ┣ 📄 index.ejs


 ┃ ┣ 📄 books.ejs

 ┃ ┗ 📄 ...
 ┣ 📄 server.js

 ┣ 📄 queries.sql

 ┣ 📄 postcss.config.js

 ┣ 📄 tailwind.config.js

 ┣ 📄 package.json

 ┗ 📄 README.md

🔐 Admin Credentials

The admin username and password are stored in the database.

Tip: For better security, consider encrypting the password using bcrypt.

🤝 Contributing

Suggestions or improvements are welcome!

Fork the repo, open a pull request or reach out directly.


👨‍💻 Author


Juan Luis

GitHub Profile


📜 License


This project is personal and intended as a capstone portfolio project.

All content and functionality are owned and maintained by the author.

