CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    read_date DATE,
    rating INTEGER,
    notes TEXT,
    isbn UNIQUE VARCHAR(20)
);
INSERT INTO books (title, author, read_date, rating, notes, isbn)
VALUES ('The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', '2023-01-15', 10, 'A classic detective story.', '978-0-123456-47-2'),
       ('Auguste Dupin', 'Edgar Allan Poe', '2023-02-20', 10, 'The first detective story ever written.', '978-0-123456-47-3'),
       ('Hamlet', 'William Shakespeare', '2023-03-10', 9, 'A tragedy about revenge and madness.', '978-0-123456-47-4'),


