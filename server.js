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

   // Crear tablas e insertar datos al iniciar la aplicación
   (async () => {
     try {
       // Crear tabla books
       await db.query(`
         CREATE TABLE IF NOT EXISTS books (
           id SERIAL PRIMARY KEY,
           title VARCHAR(255) NOT NULL,
           author VARCHAR(100),
           read_date DATE,
           rating INTEGER,
           notes TEXT,
           isbn VARCHAR(30)
         )
       `);
       await db.query('ALTER TABLE books ALTER COLUMN isbn TYPE TEXT');
       console.log('Tabla "books" creada o ya existe');

       // Crear tabla admin
       await db.query(`
         CREATE TABLE IF NOT EXISTS admin (
           id SERIAL PRIMARY KEY,
           username VARCHAR(50) NOT NULL UNIQUE,
           pass TEXT NOT NULL
         )
       `);
       console.log('Tabla "admin" creada o ya existe');

       // Insertar administrador predeterminado si no existe
       const adminCheck = await db.query("SELECT COUNT(*) FROM admin WHERE username = 'admin'");
       if (adminCheck.rows[0].count === '0') {
         const hashedPassword = await bcrypt.hash('tu_contraseña_admin', 10);
         await db.query("INSERT INTO admin (username, pass) VALUES ($1, $2)", ['admin', hashedPassword]);
         console.log('Administrador predeterminado creado con contraseña: tu_contraseña_admin');
       }

       // Migrar datos a la tabla books (ajusta según tus datos)
       const booksToMigrate = [
         {
           title: 'The Mysteries of Auguste Dupin',
           author: 'Edgar Allan Poe',
           read_date: '2023-02-20',
           rating: 10,
           notes: 'The first detective story ever written',
           isbn: '978-8418264597'
         },
         {
           title: 'Hamlet',
           author: 'William Shakespeare',
           read_date: '2023-03-10',
           rating: 9,
           notes: 'A tragedy of revenge and madness',
           isbn: '9788481301120'
         },
        {
           title: 'The Adventures of Sherlock Holmes',
           author: 'Arthur Conan Doyle',
           read_date: '2023-01-15',
           rating: 10,
           notes: 'A classic detective novel',
           isbn: '978-8408230915'
         },

         // Añade más libros aquí según los datos que exportaste
       ];

       // Verifica si ya hay datos para evitar duplicados
       const bookCount = await db.query("SELECT COUNT(*) FROM books");
       if (bookCount.rows[0].count === '0') {
         console.log('Migrando datos a la tabla books...');
         for (const book of booksToMigrate) {
           await db.query(
             "INSERT INTO books (title, author, read_date, rating, notes, isbn) VALUES ($1, $2, $3, $4, $5, $6)",
             [book.title, book.author, book.read_date, book.rating, book.notes, book.isbn]
           );
         }
         console.log('Datos migrados exitosamente');
       } else {
         console.log('Ya existen datos en la tabla books, se omite la migración');
       }
     } catch (error) {
       console.error('Error al crear tablas, administrador o migrar datos:', error.message);
     }
   })();

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