import pg from 'pg';

// Configura la conexión a tu base de datos LOCAL
const localDb = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "book_project",
  password: "stupidworld", // Cambia por tu contraseña local
  port: 5432,
});

async function exportBooks() {
  try {
    // Consulta los datos de la tabla libros
    const result = await localDb.query("SELECT * FROM books");
    const books = result.rows;

    // Genera sentencias INSERT para cada libro
    console.log("Sentencias INSERT para migrar los datos:");
    books.forEach(book => {
      // Mapea los campos de tu tabla libros a los campos de la tabla books en Render
      const title = book.title|| '';
      const author = book.author || '';
      const read_date = book.read_date || null;
      const rating = book.rating || null;
      const notes = book.reseña || '';
      const isbn = book.isbn || '';

      // Escapa comillas simples en los valores de texto
      const escapedTitle = title.replace(/'/g, "''");
      const escapedAuthor = author.replace(/'/g, "''");
      const escapedNotes = notes.replace(/'/g, "''");
      const escapedIsbn = isbn.replace(/'/g, "''");

      // Genera la sentencia INSERT
      const insertQuery = `
        INSERT INTO books (title, author, read_date, rating, notes, isbn)
        VALUES (
          '${escapedTitle}',
          '${escapedAuthor}',
          ${read_date ? `'${read_date}'` : 'NULL'},
          ${rating !== null ? rating : 'NULL'},
          '${escapedNotes}',
          '${escapedIsbn}'
        );`;
      console.log(insertQuery);
    });

    // Cierra la conexión
    await localDb.end();
  } catch (error) {
    console.error("Error al exportar los datos:", error.message);
  }
}

exportBooks();