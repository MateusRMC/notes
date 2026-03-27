"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Book() {
  const [pages, setPages] = useState([]);
  const params = useSearchParams();
  const bookID = Number(params.get("id"));

  async function getPages() {
    const req = await fetch("/api/pages");
    const res = await req.json();

    const findPages = res.filter((p) => p.book_id === bookID);

    setPages(findPages);
  }

  useEffect(() => {
    getPages();
  }, [bookID]);

  return (
    <div className="main">
      {pages.map((page) => (
        <p key={page.id}>{page.title}</p>
      ))}
    </div>
  );
}
