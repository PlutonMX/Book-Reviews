import express from 'express';
import pg from 'pg';
import bodyParser  from 'body-parser';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';




const app = express();
const port = 3000;


app.use(cookieParser('tu_secreto_super_seguro'))
function authAdmin(req, res, next) {
    const { adminSession } = req.signedCookies;

    if (adminSession === 'admin123') {
        next();
    } else {
        res.status(403).send('Acceso denegado');
    }
}

//Function to get the root page
app.get("/", (req, res) => {
  res.render("index.ejs");

})


// Function to get book cover image
const getCover = async(isbn) => {
    try {
        const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`);
        return response.data;
    } catch (error) {
        console.error("Cover not found:", error);
        return null;
    }
    }

// Connecting to the database
const db = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "book_project",
  password: "stupidworld",
  port: 5432,
});

// Setting up the view engine
app.set("view engine", "ejs");
app.set("views", "./views");

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//Testing the connection to the database
try {
  await db.query("SELECT 1");
  console.log(" Conexión a la base de datos exitosa");
} catch (err) {
  console.error(" No se pudo conectar a la base de datos:", err);
}

//Route to get the booknotes
app.get("/books", async (req, res) => { 
try {

    const result = await db.query("SELECT * FROM books");
    const books = result.rows;
    const cover = await getCover(books[0].isbn); 
    res.render("books.ejs", {
    books: books,
    cover: cover,
});
} catch (error) {
    console.error("Error al obtener los libros:", error);
    res.status(500).send("Error al obtener los libros");
}
});

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5, // Máximo 5 intentos por IP
  message: "Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.",
});


;
//Render the login admin page
app.get("/admin-login", (req, res) => {
  res.render("admin-login.ejs");
 
})

//Route to the login admin page
app.post("/admin-login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM admin WHERE username = $1", [username]);
    const admin = result.rows[0]; 

    if (!admin) {
      return res.send("Invalid credentials");
    }

   const passwordMatch = await bcrypt.compare(password, admin.pass);
if (passwordMatch) {
  res.cookie("adminSession", "admin123", {
    httpOnly: true,
    secure: true,
    signed: true,
    maxAge: 1000 * 60 * 60, 
  });
  res.redirect("/admin");
} else {
  res.send("Invalid credentials");
}

  } catch (error) {
    console.error("You can't access this page:", error);
    res.status(500).send("Unauthorized");
  }
});
 //Route to the admin page
app.get("/admin",  authAdmin, async (req, res) => { 
try {

    const result = await db.query("SELECT * FROM books");
    const books = result.rows;
    const cover = await getCover(books[0].isbn); 
    res.render("admin.ejs", {
    books: books,
    cover: cover,
});
} catch (error) {
    console.error("Error al obtener los libros:", error);
    res.status(500).send("Error al obtener los libros");
}
});
//Route to the add book page
app.post("/admin/add-book", async (req, res) => { 
  const { title, author, rating, read_date, isbn, review } = req.body;
  const cover = await getCover(isbn); // Get the cover image using the ISBN
  if (!cover) {
    return res.status(400).send("Cover image not found");
  }
  try {
    await db.query("INSERT INTO books (title, author, read_date, rating, notes, isbn) VALUES ($1, $2, $3, $4, $5, $6)", [title, author, read_date, rating, review, isbn]);
    res.redirect("/admin");
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).send("Error adding book");
  }
});


//Route to the edit book page
app.get("/admin/edit-book/:id",authAdmin, async (req, res) => {
  const bookId = req.params.id;
  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [bookId]);
    const book = result.rows[0];
    if (!book) {
      return res.status(404).send("Book not found");
    }
    res.render("edit-review.ejs", { book });
  } catch (error) {
    console.error("Error fetching book for edit:", error);
    res.status(500).send("Error fetching book for edit");
  }
});
//Route to handle the edit book form submission
app.post("/admin/edit-book/:id", async (req, res) => {
  const bookId = req.params.id;
  const { title, author, rating, read_date, isbn, review } = req.body;
  try {
    await db.query("UPDATE books SET title = $1, author = $2, read_date = $3, rating = $4, notes = $5, isbn = $6 WHERE id = $7", [title, author, read_date, rating, review, isbn, bookId]);
    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).send("Error updating book");
  }
});

//Route to the delete book page
app.post("/admin/delete-book", async (req, res) => { 
  const deletedItem = req.body.deleteBookId;
  try {
    await db.query("DELETE FROM books WHERE id = $1", [deletedItem]);
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).send("Error deleting book");
  }

})




app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
