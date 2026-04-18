"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [books, setBooks] = useState([]);
  const [newBook, setNewBook] = useState("");
  const [sendingBook, setSendingBook] = useState(false);
  const [bookID, setBookID] = useState("");

  async function getBooks() {
    const req = await fetch("/api/books/");
    const res = await req.json();

    setBooks(res);
  }

  async function postBooks(e) {
    e.preventDefault();
    setSendingBook(true);

    const req = await fetch("/api/books/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: newBook }),
    });

    setNewBook("");
    getBooks();
    setSendingBook(false);
  }

  useEffect(() => {
    getBooks();
  }, []);

  return (
    <>
      <div className="booksList">
        <button className="addBookButton">Add book</button>
        {books.map((book) => (
          <p key={book.id} onClick={() => setBookID(book.id)}>
            {book.title}
          </p>
        ))}
      </div>
      <div className="showArea">
        <h1 className="header">Notes for Life</h1>
        {bookID}
      </div>
    </>
  );
}
