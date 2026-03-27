"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [books, setBooks] = useState([]);

  async function getBooks() {
    const req = await fetch("/api/books/");
    const res = await req.json();

    setBooks(res);
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
            <p key={book.id}>{book.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
