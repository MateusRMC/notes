"use client";

import { useEffect, useState, useRef } from "react";
import Markdown from "react-markdown";
import { ThemeToggle } from "../lib/themeToggle";
import { useRouter } from "next/navigation";

export default function NotesPageClient({ user }) {
  const router = useRouter(); //navigation handler
  const pullStartY = useRef(null); //refresh page refs
  const pullTriggered = useRef(false); //refresh page refs

  const [notes, setNotes] = useState([]); //all notes from the user
  const [newNoteTitle, setNewNoteTitle] = useState(""); //inputs
  const [newNoteContent, setNewNoteContent] = useState(""); //inputs
  const [sendingNote, setSendingNote] = useState(false); //sending handler state
  const [deletingNote, setDeletingNote] = useState(false); //deleting note handler state

  const [selectedNote, setSelectedNote] = useState(null); //selected note object (ID, TITLE AND CONTENT) if "null" -> no note is selected therefore you're creating a new note
  const [editNote, setEditNote] = useState(false); // editing note or note;
  const [notesList, setNotesList] = useState(true); //expand and collapse notesList
  const [sideBarToggle, setSidebarToggle] = useState(false); //expand and collapse sidebar
  const [optionsMenu, setOptionsMenu] = useState(null); //toggle note options menu card

  function handlePullStart(e) {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY;
      pullTriggered.current = false;
    }
  }

  function handlePullMove(e) {
    if (pullStartY.current === null || pullTriggered.current) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY.current;

    if (window.scrollY === 0 && distance > 80) {
      pullTriggered.current = true;
      getNotes();
    }
  }

  function handlePullEnd() {
    pullStartY.current = null;
    pullTriggered.current = false;
  }

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

  async function deleteNote(note) {
    setDeletingNote(true);

    await fetch("/api/notes", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: note.id,
      }),
    });

    setOptionsMenu(null);
    setDeletingNote(false);
    getNotes();
  }

  async function updateNote(note) {
    await fetch("/api/notes", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: note.id,
        title: newNoteTitle,
        content: newNoteContent,
      }),
    });
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
    setSelectedNote(null);

    const isPortrait = window.matchMedia("(orientation: portrait)").matches;

    isPortrait && setSidebarToggle(false);
  }

  useEffect(() => {
    getNotes();
  }, []);

  return (
    <>
      <div
        className="sideBar"
        style={{ display: sideBarToggle ? "flex" : "none" }}
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
      >
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
        <div className="notesList" onScroll={() => setOptionsMenu(null)}>
          {notes.map((note) => (
            <div className="noteItem" key={note.id}>
              <button
                className="noteCard"
                onClick={() => {
                  noteListHandle(note);
                  setOptionsMenu(null);
                }}
              >
                {note.title}
              </button>
              <img
                src="/options.svg"
                className="optionsIcon"
                onClick={() => setOptionsMenu(optionsMenu === note.id ? null : note.id)}
              />
              {optionsMenu === note.id && (
                <div className="noteOptions">
                  <button
                    className="deleteNote"
                    onClick={() => deleteNote(note)}
                    disabled={deletingNote ? true : false}
                  >
                    {deletingNote ? "Deleting..." : "Delete"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <button className="logout" onClick={logout}>
          Logout
        </button>
      </div>

      <div
        className="mainArea"
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
      >
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
                placeholder="Note title (optional)"
                onChange={(e) => setNewNoteTitle(e.target.value)}
                value={newNoteTitle}
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
