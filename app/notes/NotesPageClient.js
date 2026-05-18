"use client";

import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { ThemeToggle } from "../lib/themeToggle";

export default function NotesPageClient({ user }) {
  const [notes, setNotes] = useState([]);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState(0);
  const [notesList, setNotesList] = useState(true);
  const [sideBarToggle, setSidebarToggle] = useState(false);

  async function getNotes() {
    const req = await fetch("/api/notes/");

    if (!req.ok) {
      console.error("Erro ao buscar notas");
      setNotes([]);
      return;
    }

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

    if (!req.ok) {
      console.error("Erro ao salvar nota");
      setSendingNote(false);
      return;
    }

    setNewNoteTitle("");
    setNewNoteContent("");
    setSendingNote(false);
    getNotes();
  }

  async function logout() {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!res.ok) {
      console.error("Erro ao fazer logout");
      return;
    }
  }

  async function noteListHandle(note) {
    setSelectedNote(notes.find((n) => n.id === note.id));

    const isPortrait = window.matchMedia("(orientation: portrait)").matches;

    isPortrait && setSidebarToggle(false);
  }

  async function createNewNoteHandle() {
    setSelectedNote(0);

    const isPortrait = window.matchMedia("(orientation: portrait)").matches;

    isPortrait && setSidebarToggle(false);
  }

  useEffect(() => {
    getNotes();
  }, []);

  return (
    <>
      <div className="sideBar" style={{ display: sideBarToggle ? "flex" : "none" }}>
        <div className="header-sideBar">
          <img className="app-logo" src="simplenotes.jpg" />

          {sideBarToggle && (
            <img
              className="sidebarClose"
              src="/sidebar-close.png"
              alt="Close sidebar"
              onClick={() => setSidebarToggle(false)}
            />
          )}
        </div>

        <button className="addNoteButton" onClick={() => createNewNoteHandle()}>
          Write new note
        </button>
        <p
          onClick={() => setNotesList(!notesList)}
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginLeft: "30px",
            marginRight: "20px",
            marginTop: "10px",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <small>Your notes ({notes.length})</small>

          {notesList ? (
            <img className="arrowIcon" src="/arrowUp.svg" alt="Collapse notes list" />
          ) : (
            <img className="arrowIcon" src="/arrowDown.svg" alt="Expand notes list" />
          )}
        </p>
        <div className="notesList">
          {notes.map((note) => (
            <button
              style={{ display: notesList ? "" : "none" }}
              className="noteCard"
              key={note.id}
              onClick={() => noteListHandle(note)}
            >
              {note.title}
            </button>
          ))}
        </div>
        <button className="logout" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="mainArea">
        <div
          className="topBar"
          style={{ justifyContent: sideBarToggle ? "flex-end" : "space-between" }}
        >
          {sideBarToggle ? (
            ""
          ) : (
            <img
              className="sidebarOpen"
              src="/sidebar-open.png"
              alt="Open sidebar"
              onClick={() => setSidebarToggle(true)}
            />
          )}

          <ThemeToggle />
        </div>

        <div className="showArea">
          {selectedNote ? (
            <div className="displayNote">
              <h3 className="noteTitle">{selectedNote.title}</h3>
              <Markdown>{selectedNote.content}</Markdown>
            </div>
          ) : (
            <form className="formNote" onSubmit={postNote}>
              <input
                className="newTitle"
                type="text"
                placeholder="Untitled"
                onChange={(e) => setNewNoteTitle(e.target.value)}
                value={newNoteTitle}
                required
              />

              <textarea
                className="newContent"
                onChange={(e) => setNewNoteContent(e.target.value)}
                value={newNoteContent}
                placeholder="What's on your mind?"
                required
              />

              <input
                className="formSubmit"
                type="submit"
                value={sendingNote ? "Saving note..." : "Save note"}
                disabled={sendingNote}
              />
            </form>
          )}
        </div>
      </div>
    </>
  );
}
