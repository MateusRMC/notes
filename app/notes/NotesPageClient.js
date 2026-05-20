"use client";

import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { ThemeToggle } from "../lib/themeToggle";
import { useRouter } from "next/navigation";

export default function NotesPageClient({ user }) {
  const router = useRouter(); //navigation handler

  const [notes, setNotes] = useState([]); //all notes from the user
  const [newNoteTitle, setNewNoteTitle] = useState(""); //inputs
  const [newNoteContent, setNewNoteContent] = useState(""); //inputs
  const [sendingNote, setSendingNote] = useState(false); //sending handler state
  const [selectedNote, setSelectedNote] = useState(0); //selected note object (ID, TITLE AND CONTENT) if 0 no note is selected
  const [notesList, setNotesList] = useState(true); //expand and collapse notesList
  const [sideBarToggle, setSidebarToggle] = useState(false); //expand and collapse sidebar
  const [optionsMenu, setOptionsMenu] = useState(null); //toggle note options menu card

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

    router.push("/");
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
              src="/sidebar-close.svg"
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
            <div className="noteItem" key={note.id}>
              <button className="noteCard" onClick={() => noteListHandle(note)}>
                {note.title}
              </button>

              <img
                src="/options.svg"
                className="optionsIcon"
                onClick={() => setOptionsMenu(optionsMenu === note.id ? null : note.id)}
              />

              {optionsMenu === note.id && <button className="deleteNote">Delete</button>}
            </div>
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
              src="/sidebar-open.svg"
              alt="Open sidebar"
              onClick={() => {
                setSidebarToggle(true);
                getNotes();
                setOptionsMenu(null);
              }}
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
