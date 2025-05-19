import express from 'express';
   import pg from 'pg';
   import bodyParser from 'body-parser';
   import axios from 'axios';
   import cookieParser from 'cookie-parser';
   import bcrypt from 'bcrypt';
   import rateLimit from 'express-rate-limit';

   // Cargar variables de entorno
   import dotenv from 'dotenv';
   dotenv.config();

   const app = express();
   const port = process.env.PORT || 3000;

   app.use(cookieParser('tu_secreto_super_seguro'));

   // Middleware para autenticar al administrador
   function authAdmin(req, res, next) {
     const { adminSession } = req.signedCookies;
     if (adminSession === 'admin123') {
       next();
     } else {
       res.status(403).send('Acceso denegado');
     }
   }

   // Validar DATABASE_URL antes de conectar
   if (!process.env.DATABASE_URL) {
     console.error('Error: DATABASE_URL no está definida. Configura esta variable de entorno.');
     process.exit(1);
   }

   let db;
   try {
     // Conexión a la base de datos usando DATABASE_URL de Render
     db = new pg.Pool({
       connectionString: process.env.DATABASE_URL,
       ssl: {
         require: true,
         rejectUnauthorized: false
       }
     });
     // Prueba de conexión básica
     await db.query('SELECT 1');
     console.log('Conexión a la base de datos exitosa');
   } catch (error) {
     console.error('Error al conectar a la base de datos:', error.message);
     process.exit(1);
   }

   
   // Configuración del motor de vistas
   app.set("view engine", "ejs");
   app.set("views", "./views");

   // Middleware
   app.use(bodyParser.urlencoded({ extended: true }));
   app.use(express.static("public"));

   // Ruta para la página principal
   app.get("/", (req, res) => {
     res.render("index.ejs");
   });

   // Función para obtener la portada del libro
   const getCover = async (isbn) => {
     try {
       const response = await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`);
       return response.data;
     } catch (error) {
       console.error("Portada no encontrada:", error.message);
       return null;
     }
   };

   // Ruta para obtener los libros
   app.get("/books", async (req, res) => {
     try {
       const result = await db.query("SELECT * FROM books");
       const books = result.rows;
       let cover = null;
       if (books.length > 0) {
         cover = await getCover(books[0].isbn);
       }
       res.render("books.ejs", {
         books: books,
         cover: cover,
       });
     } catch (error) {
       console.error("Error al obtener los libros:", error.message);
       res.status(500).send("Error al obtener los libros");
     }
   });

   // Limitador de intentos de login
   const loginLimiter = rateLimit({
     windowMs: 5 * 60 * 1000,
     max: 5,
     message: "Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.",
   });

   // Ruta para renderizar la página de login de admin
   app.get("/admin-login", (req, res) => {
     res.render("admin-login.ejs");
   });

   // Ruta para manejar el login de admin
   app.post("/admin-login", loginLimiter, async (req, res) => {
     const { username, password } = req.body;
     try {
       const result = await db.query("SELECT * FROM admin WHERE username = $1", [username]);
       const admin = result.rows[0];

       if (!admin) {
         return res.send("Credenciales inválidas");
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
         res.send("Credenciales inválidas");
       }
     } catch (error) {
       console.error("Error al acceder a la página:", error.message);
       res.status(500).send("No autorizado");
     }
   });

   // Ruta para la página de admin
   app.get("/admin", authAdmin, async (req, res) => {
     try {
       const result = await db.query("SELECT * FROM books");
       const books = result.rows;
       let cover = null;
       if (books.length > 0) {
         cover = await getCover(books[0].isbn);
       }
       res.render("admin.ejs", {
         books: books,
         cover: cover,
       });
     } catch (error) {
       console.error("Error al obtener los libros:", error.message);
       res.status(500).send("Error al obtener los libros");
     }
   });

   // Ruta para agregar un libro
   app.post("/admin/add-book", async (req, res) => {
     const { title, author, rating, read_date, isbn, review } = req.body;
     const cover = await getCover(isbn);
     if (!cover) {
       return res.status(400).send("Imagen de portada no encontrada");
     }
     try {
       await db.query(
         "INSERT INTO books (title, author, read_date, rating, notes, isbn) VALUES ($1, $2, $3, $4, $5, $6)",
         [title, author, read_date, rating, review, isbn]
       );
       res.redirect("/admin");
     } catch (error) {
       console.error("Error al agregar el libro:", error.message);
       res.status(500).send("Error al agregar el libro");
     }
   });

   // Ruta para editar un libro
   app.get("/admin/edit-book/:id", authAdmin, async (req, res) => {
     const bookId = req.params.id;
     try {
       const result = await db.query("SELECT * FROM books WHERE id = $1", [bookId]);
       const book = result.rows[0];
       if (!book) {
         return res.status(404).send("Libro no encontrado");
       }
       res.render("edit-review.ejs", { book });
     } catch (error) {
       console.error("Error al obtener el libro para editar:", error.message);
       res.status(500).send("Error al obtener el libro para editar");
     }
   });

   // Ruta para manejar el formulario de edición de libro
   app.post("/admin/edit-book/:id", async (req, res) => {
     const bookId = req.params.id;
     const { title, author, rating, read_date, isbn, review } = req.body;
     try {
       await db.query(
         "UPDATE books SET title = $1, author = $2, read_date = $3, rating = $4, notes = $5, isbn = $6 WHERE id = $7",
         [title, author, read_date, rating, review, isbn, bookId]
       );
       res.redirect("/admin");
     } catch (error) {
       console.error("Error al actualizar el libro:", error.message);
       res.status(500).send("Error al actualizar el libro");
     }
   });

   // Ruta para eliminar un libro
   app.post("/admin/delete-book", async (req, res) => {
     const deletedItem = req.body.deleteBookId;
     try {
       await db.query("DELETE FROM books WHERE id = $1", [deletedItem]);
       res.redirect("/admin");
     } catch (error) {
       console.error("Error al eliminar el libro:", error.message);
       res.status(500).send("Error al eliminar el libro");
     }
   });

   // Iniciar el servidor
   app.listen(port, () => {
     console.log(`Servidor corriendo en el puerto ${port}`);
   });