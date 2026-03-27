"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [books, setBooks] = useState([]);
  const [newBook, setNewBook] = useState("");

  async function getBooks() {
    const req = await fetch("/api/books/");
    const res = await req.json();

    setBooks(res);
  }

  async function postBooks(e) {
    e.preventDefault();

    const req = await fetch("/api/books/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: newBook }),
    });

    setNewBook("");
    getBooks();
  }

  useEffect(() => {
    getBooks();
  }, []);

  return (
    <div className="main">
      <h1>Notes for life.</h1>
      <div className="showBooks">
        {books.map((book) => (
          <Link key={book.id} href={`/book?id=${book.id}`}>
            <p>{book.title}</p>
          </Link>
        ))}
      </div>
      <div className="newBook">
        <form onSubmit={postBooks}>
          <input
            type="text"
            name="title"
            placeholder="Book title"
            onChange={(e) => setNewBook(e.target.value)}
            value={newBook}
          />
          <input type="submit" value="Create new book" />
        </form>
      </div>
    </div>
  );
}
