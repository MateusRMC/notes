"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";

export default function Home() {
  const [notes, setNotes] = useState([]);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState(0);
  const [notesList, setNotesList] = useState(true);

  async function getNotes() {
    const req = await fetch("/api/notes/");
    const res = await req.json();

    setNotes(res);
  }

  async function postNote(e) {
    e.preventDefault();
    setSendingNote(true);

    const req = await fetch("/api/notes/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: newNoteTitle, content: newNoteContent }),
    });

    setNewNoteTitle("");
    setNewNoteContent("");
    setSendingNote(false);
    getNotes();
  }

  useEffect(() => {
    getNotes();
  }, []);

  return (
    <>
      <div className="sideBar">
        <button className="addNoteButton" onClick={() => setSelectedNote(0)}>
          Add note
        </button>
        <div className="notesList">
          <p
            onClick={() => (notesList ? setNotesList(false) : setNotesList(true))}
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <small>Your notes ({notes.length})</small>
            {notesList ? (
              <img src="arrowUp.svg" style={{ cursor: "pointer" }} />
            ) : (
              <img src="arrowDown.svg" style={{ cursor: "pointer" }} />
            )}
          </p>
          {notes.map((note) => (
            <button
              style={{ display: notesList ? "" : "none" }}
              className="noteCard"
              key={note.id}
              onClick={() => setSelectedNote(notes.find((n) => n.id === note.id))}
            >
              {note.title}
            </button>
          ))}
        </div>
      </div>
      <div className="showArea">
        {selectedNote ? (
          <div className="displayNote">
            <h1>{selectedNote.title}</h1>
            <Markdown>{selectedNote.content}</Markdown>
          </div>
        ) : (
          <form className="formNote" onSubmit={postNote}>
            <h3>Write your new note</h3>
            <input
              className="newTitle"
              type="text"
              placeholder="Note title"
              onChange={(e) => setNewNoteTitle(e.target.value)}
              value={newNoteTitle}
            />
            <textarea
              className="newContent"
              onChange={(e) => setNewNoteContent(e.target.value)}
              value={newNoteContent}
              placeholder="Note content"
            />
            <input
              className="formSubmit"
              type="submit"
              value={sendingNote ? "Sending..." : "Send note"}
              disabled={sendingNote && true}
            />
          </form>
        )}
      </div>
    </>
  );
}
