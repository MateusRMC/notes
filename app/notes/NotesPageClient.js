"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "../lib/themeToggle";
import { useRouter } from "next/navigation";

export default function NotesPageClient({ user }) {
  const router = useRouter(); //navigation handler

  const [notes, setNotes] = useState([]); //all notes from the user
  const [editorContent, setEditorContent] = useState(""); //content currently visible in the editor
  const [deletingNote, setDeletingNote] = useState(false); //deleting note handler state
  const [selectedNote, setSelectedNote] = useState(null); //selected note object; if null -> blank new note screen
  const [notesList, setNotesList] = useState(true); //expand and collapse notesList
  const [sideBarToggle, setSidebarToggle] = useState(false); //expand and collapse sidebar
  const [optionsMenu, setOptionsMenu] = useState(null); //toggle note options menu card

  const [saveStatus, setSaveStatus] = useState("saved"); //autosave status: saved, unsaved, saving or error

  const autosaveTimeoutRef = useRef(null); //stores the current autosave debounce timer

  const activeNoteKeyRef = useRef(null); //keeps track of which note is currently open

  const latestContentRef = useRef(new Map()); //latest local content for each note
  const savedContentRef = useRef(new Map()); //last content successfully saved on the server
  const noteIdRef = useRef(new Map()); //database ID associated with each local note
  const savePromiseRef = useRef(new Map()); //prevents multiple simultaneous saves of the same note
  const deletedNoteKeysRef = useRef(new Set()); //keeps track of notes deleted while a request may still be running

  const notesRefreshVersionRef = useRef(0); //prevents an older sidebar refresh from replacing a newer one

  //gets the first line of the note and uses it as the title
  function getTitleFromContent(content) {
    return content.split(/\r?\n/)[0].trim();
  }

  //every note has a stable local key
  //existing notes use their database ID
  //temporary notes use a client-generated ID
  function getNoteKey(note) {
    if (!note) return null;

    return note.clientId ?? `db-${note.id}`;
  }

  //only changes the save status if this is still the note currently open
  function setStatusForNote(noteKey, status) {
    if (activeNoteKeyRef.current === noteKey) {
      setSaveStatus(status);
    }
  }

  async function getNotes() {
    const req = await fetch("/api/notes/");

    if (!req.ok) {
      console.error("Erro ao buscar notas");
      setNotes([]);
      return;
    }

    const res = await req.json();

    //gives every note a stable client-side key
    const loadedNotes = res.map((note) => ({
      ...note,
      clientId: `db-${note.id}`,
      isTemporary: false,
    }));

    //stores the server state locally so autosave knows what is already saved
    loadedNotes.forEach((note) => {
      const noteKey = getNoteKey(note);

      latestContentRef.current.set(noteKey, note.content);
      savedContentRef.current.set(noteKey, note.content);
      noteIdRef.current.set(noteKey, note.id);
    });

    setNotes(loadedNotes);
  }

  //refreshes ONLY the notes shown in the sidebar
  //does not touch editorContent, selectedNote or the autosave refs
  async function refreshNotesList() {
    const refreshVersion = ++notesRefreshVersionRef.current;

    const req = await fetch("/api/notes/");

    if (!req.ok) {
      console.error("Erro ao atualizar lista de notas");
      return;
    }

    const res = await req.json();

    /*
      If another refresh started after this one,
      this response is already old and should be ignored.
    */
    if (refreshVersion !== notesRefreshVersionRef.current) {
      return;
    }

    setNotes((currentNotes) => {
      /*
        Notes returned by the server are already ordered
        by updated_at DESC.

        We preserve the existing clientId whenever possible
        so temporary notes that became real notes don't
        suddenly get a different React key.
      */
      const refreshedServerNotes = res.map((serverNote) => {
        const existingNote = currentNotes.find((localNote) => {
          const localNoteKey = getNoteKey(localNote);

          const localDatabaseId = noteIdRef.current.get(localNoteKey) ?? localNote.id;

          return localDatabaseId === serverNote.id;
        });

        const clientId = existingNote?.clientId ?? `db-${serverNote.id}`;

        const noteKey = clientId;

        const latestLocalContent = latestContentRef.current.get(noteKey);

        const savedContent = savedContentRef.current.get(noteKey);

        /*
          If the user started typing again while this GET
          was happening, keep the newer local content in
          the sidebar instead of replacing it with an
          older server response.
        */
        const hasUnsavedLocalChanges =
          latestLocalContent !== undefined && latestLocalContent !== savedContent;

        if (hasUnsavedLocalChanges) {
          return {
            ...serverNote,
            clientId,
            isTemporary: false,
            title: getTitleFromContent(latestLocalContent),
            content: latestLocalContent,
          };
        }

        return {
          ...serverNote,
          clientId,
          isTemporary: false,
        };
      });

      const serverIds = new Set(res.map((serverNote) => serverNote.id));

      /*
        Keeps notes that still only exist locally.

        Example:
        You started another new note while a previous
        note was still being saved/refreshed.
      */
      const localOnlyNotes = currentNotes.filter((localNote) => {
        const noteKey = getNoteKey(localNote);

        if (deletedNoteKeysRef.current.has(noteKey)) {
          return false;
        }

        const databaseId = noteIdRef.current.get(noteKey) ?? localNote.id;

        if (databaseId == null) {
          return true;
        }

        return !serverIds.has(databaseId);
      });

      /*
        Temporary/local-only notes remain at the top.

        Everything that exists in the database follows
        the exact order returned by GET /api/notes.
      */
      return [...localOnlyNotes, ...refreshedServerNotes];
    });
  }

  //updates the note locally in the sidebar
  //this happens instantly and does NOT wait for the server
  function updateLocalNote(noteKey, content) {
    const title = getTitleFromContent(content);

    latestContentRef.current.set(noteKey, content);

    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        getNoteKey(note) === noteKey
          ? {
              ...note,
              title,
              content,
            }
          : note,
      ),
    );

    setSelectedNote((currentNote) =>
      getNoteKey(currentNote) === noteKey
        ? {
            ...currentNote,
            title,
            content,
          }
        : currentNote,
    );
  }

  //creates a temporary note entirely in React
  //at this point nothing has been sent to the server yet
  function createTemporaryNote(content) {
    const clientId = crypto.randomUUID();

    const temporaryNote = {
      id: null,
      clientId,
      title: getTitleFromContent(content),
      content,
      isTemporary: true,
    };

    latestContentRef.current.set(clientId, content);
    noteIdRef.current.set(clientId, null);

    //adds the note to the sidebar immediately
    setNotes((currentNotes) => [temporaryNote, ...currentNotes]);

    setSelectedNote(temporaryNote);

    activeNoteKeyRef.current = clientId;

    setSaveStatus("unsaved");

    return temporaryNote;
  }

  //handles both POST for temporary notes and PATCH for existing notes
  async function persistNote(noteKey) {
    if (!noteKey) return;

    //if this note is already being saved, don't start another request
    //the current save will check for newer changes when it finishes
    if (savePromiseRef.current.has(noteKey)) {
      return savePromiseRef.current.get(noteKey);
    }

    const savePromise = (async () => {
      try {
        while (!deletedNoteKeysRef.current.has(noteKey)) {
          //always reads the newest local content
          const content = latestContentRef.current.get(noteKey) ?? "";

          const savedContent = savedContentRef.current.get(noteKey);

          const noteId = noteIdRef.current.get(noteKey);

          //don't create a completely empty temporary note
          if (noteId == null && !content.trim()) {
            return;
          }

          //nothing changed since the last successful save
          if (content === savedContent) {
            setStatusForNote(noteKey, "saved");
            return;
          }

          setStatusForNote(noteKey, "saving");

          const title = getTitleFromContent(content);

          //if the note has no database ID yet, this is its first save
          if (noteId == null) {
            const req = await fetch("/api/notes/", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title,
                content,
              }),
            });

            if (!req.ok) {
              throw new Error("Erro ao criar nota");
            }

            /*
              IMPORTANT:

              The POST endpoint needs to return the created note,
              or at least its ID.

              Example:

              {
                id: 123,
                title: "Shopping list",
                content: "Shopping list"
              }
            */

            const response = await req.json();

            //supports APIs that return either the note directly
            //or something like { note: {...} }
            const createdNote = response.note ?? response;

            if (createdNote.id == null) {
              throw new Error("POST /api/notes precisa retornar o ID da nota criada");
            }

            const createdId = createdNote.id;

            //the temporary note now has a real database ID
            noteIdRef.current.set(noteKey, createdId);

            //IMPORTANT:
            //marks ONLY the content that was actually sent as saved
            //we do not replace the current editor content with the server response
            savedContentRef.current.set(noteKey, content);

            //if the user deleted the temporary note while POST was running,
            //delete the newly-created database note immediately
            if (deletedNoteKeysRef.current.has(noteKey)) {
              await fetch("/api/notes", {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  id: createdId,
                }),
              });

              return;
            }

            //replaces the temporary ID information with the real database ID
            //without changing whatever the user is currently typing
            setNotes((currentNotes) =>
              currentNotes.map((note) =>
                getNoteKey(note) === noteKey
                  ? {
                      ...note,
                      id: createdId,
                      isTemporary: false,
                    }
                  : note,
              ),
            );

            setSelectedNote((currentNote) =>
              getNoteKey(currentNote) === noteKey
                ? {
                    ...currentNote,
                    id: createdId,
                    isTemporary: false,
                  }
                : currentNote,
            );
          } else {
            //the note already exists in the database, so we PATCH it
            const req = await fetch("/api/notes", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: noteId,
                title,
                content,
              }),
            });

            if (!req.ok) {
              throw new Error("Erro ao atualizar nota");
            }

            //this exact version is now saved on the server
            savedContentRef.current.set(noteKey, content);
          }

          /*
            The user may have continued typing while POST/PATCH
            was travelling over the internet.

            If so, latestContentRef will now contain newer text.

            The while loop runs again and saves that newer version,
            without EVER replacing the editor content.
          */

          const latestContent = latestContentRef.current.get(noteKey);

          const newestSavedContent = savedContentRef.current.get(noteKey);

          if (latestContent === newestSavedContent) {
            /*
              The note itself is completely saved.

              We mark it as saved immediately and allow
              persistNote() to finish normally.
            */
            setStatusForNote(noteKey, "saved");

            /*
              Refreshes the sidebar from the database IN THE BACKGROUND.

              IMPORTANT:
              We intentionally do NOT await this.

              That means savePromise is free to finish and be removed,
              so if the user starts typing again, another autosave
              can start normally even if this GET is still happening.
            */
            void refreshNotesList();

            return;
          }
        }
      } catch (error) {
        console.error("Erro ao salvar nota:", error);

        setStatusForNote(noteKey, "error");
      } finally {
        savePromiseRef.current.delete(noteKey);
      }
    })();

    savePromiseRef.current.set(noteKey, savePromise);

    return savePromise;
  }

  //forces the current note to save immediately instead of waiting for the debounce
  function saveCurrentNoteImmediately() {
    const noteKey = activeNoteKeyRef.current;

    if (!noteKey) {
      return Promise.resolve();
    }

    //cancels the pending debounce because we're saving now
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    const content = latestContentRef.current.get(noteKey) ?? "";

    const noteId = noteIdRef.current.get(noteKey);

    //if this is an empty temporary note, don't send it to the server
    if (noteId == null && !content.trim()) {
      return Promise.resolve();
    }

    return persistNote(noteKey);
  }

  //finishes the current note before moving somewhere else
  //saving happens in the background so navigation still feels instant
  function finishCurrentNote() {
    const noteKey = activeNoteKeyRef.current;

    if (!noteKey) return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    const content = latestContentRef.current.get(noteKey) ?? "";

    const noteId = noteIdRef.current.get(noteKey);

    //if a temporary note was erased completely, discard it locally
    if (noteId == null && !content.trim()) {
      deletedNoteKeysRef.current.add(noteKey);

      setNotes((currentNotes) => currentNotes.filter((note) => getNoteKey(note) !== noteKey));

      return;
    }

    //fire-and-forget:
    //the UI does not wait for the network before moving to another note
    void persistNote(noteKey);
  }

  async function deleteNote(note) {
    setDeletingNote(true);

    const noteKey = getNoteKey(note);

    const noteId = noteIdRef.current.get(noteKey) ?? note.id;

    //marks it as deleted so an autosave cannot keep saving it
    deletedNoteKeysRef.current.add(noteKey);

    if (activeNoteKeyRef.current === noteKey && autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    //temporary note that hasn't reached the database yet
    if (noteId == null) {
      setNotes((currentNotes) =>
        currentNotes.filter((currentNote) => getNoteKey(currentNote) !== noteKey),
      );

      if (activeNoteKeyRef.current === noteKey) {
        setSelectedNote(null);
        setEditorContent("");

        activeNoteKeyRef.current = null;

        setSaveStatus("saved");
      }

      setOptionsMenu(null);
      setDeletingNote(false);

      /*
        If a POST is already in progress, persistNote()
        will notice deletedNoteKeysRef and delete the
        database version as soon as the POST returns.
      */

      if (!savePromiseRef.current.has(noteKey)) {
        latestContentRef.current.delete(noteKey);

        savedContentRef.current.delete(noteKey);

        noteIdRef.current.delete(noteKey);

        deletedNoteKeysRef.current.delete(noteKey);
      }

      return;
    }

    const req = await fetch("/api/notes", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: noteId,
      }),
    });

    if (!req.ok) {
      console.error("Erro ao deletar nota");

      deletedNoteKeysRef.current.delete(noteKey);

      setDeletingNote(false);

      return;
    }

    setNotes((currentNotes) =>
      currentNotes.filter((currentNote) => getNoteKey(currentNote) !== noteKey),
    );

    //if the deleted note is currently selected, returns to new note mode
    if (activeNoteKeyRef.current === noteKey) {
      setSelectedNote(null);
      setEditorContent("");

      activeNoteKeyRef.current = null;

      setSaveStatus("saved");
    }

    latestContentRef.current.delete(noteKey);

    savedContentRef.current.delete(noteKey);

    noteIdRef.current.delete(noteKey);

    deletedNoteKeysRef.current.delete(noteKey);

    setOptionsMenu(null);
    setDeletingNote(false);

    //refreshes sidebar order/data after deletion
    void refreshNotesList();
  }

  async function logout() {
    //saves the current note before logging out
    await saveCurrentNoteImmediately();

    const res = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!res.ok) {
      console.error("Erro ao fazer logout");

      return;
    }

    router.push("/");
  }

  function noteListHandle(note) {
    const noteKey = getNoteKey(note);

    setSelectedNote(note);
    setEditorContent(note.content);

    activeNoteKeyRef.current = noteKey;

    //makes sure our refs know the latest version of this note
    latestContentRef.current.set(noteKey, note.content);

    if (note.id != null) {
      noteIdRef.current.set(noteKey, note.id);
    }

    const savedContent = savedContentRef.current.get(noteKey);

    setSaveStatus(savedContent === note.content ? "saved" : "unsaved");

    const isPortrait = window.matchMedia("(orientation: portrait)").matches;

    isPortrait && setSidebarToggle(false);
  }

  function createNewNoteHandle() {
    setSelectedNote(null);
    setEditorContent("");

    activeNoteKeyRef.current = null;

    setSaveStatus("saved");

    const isPortrait = window.matchMedia("(orientation: portrait)").matches;

    isPortrait && setSidebarToggle(false);
  }

  //handles everything typed inside the editor
  function handleEditorChange(e) {
    const content = e.target.value;

    //the textarea always updates immediately in React
    setEditorContent(content);

    //there is no note yet
    if (!selectedNote) {
      //don't create a temporary note for spaces/newlines only
      if (!content.trim()) {
        return;
      }

      createTemporaryNote(content);

      return;
    }

    const noteKey = getNoteKey(selectedNote);

    //updates sidebar + local note immediately
    //no server request happens here
    updateLocalNote(noteKey, content);

    setSaveStatus("unsaved");
  }

  const selectedNoteKey = getNoteKey(selectedNote);

  //autosave with debounce
  useEffect(() => {
    //there isn't a note yet
    if (!selectedNoteKey) return;

    const content = latestContentRef.current.get(selectedNoteKey) ?? editorContent;

    const savedContent = savedContentRef.current.get(selectedNoteKey);

    const noteId = noteIdRef.current.get(selectedNoteKey);

    //don't POST an empty temporary note
    if (noteId == null && !content.trim()) {
      return;
    }

    //this exact version is already saved
    if (content === savedContent) {
      setStatusForNote(selectedNoteKey, "saved");

      return;
    }

    setStatusForNote(selectedNoteKey, "unsaved");

    //every new change cancels the previous timer
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    //waits 700ms after the user stops typing before saving
    autosaveTimeoutRef.current = setTimeout(() => {
      persistNote(selectedNoteKey);
    }, 700);

    //cleanup: if the content changes before 700ms, cancels the old timer
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [editorContent, selectedNoteKey]);

  useEffect(() => {
    getNotes();
  }, []);

  return (
    <>
      <div
        className="sideBar"
        style={{
          display: sideBarToggle ? "flex" : "none",
        }}
      >
        <div className="header-sideBar">
          <img className="app-logo" src="/simplenotes.jpg" alt="Simplenotes" />

          {sideBarToggle && (
            <img
              className="sidebarClose"
              src="/sidebar-close.svg"
              alt="Close sidebar"
              onClick={() => setSidebarToggle(false)}
            />
          )}
        </div>

        <button
          className="addNoteButton"
          onClick={() => {
            //saves the current note in the background
            //without delaying the new-note screen
            finishCurrentNote();

            createNewNoteHandle();
          }}
        >
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
          {notes.map((note) => {
            const noteKey = getNoteKey(note);

            return (
              <div
                className="noteItem"
                key={noteKey}
                style={{
                  display: notesList ? "flex" : "none",
                }}
              >
                <button
                  className="noteCard"
                  onClick={() => {
                    //starts saving the current note in the background
                    //but DOES NOT wait for the internet
                    finishCurrentNote();

                    noteListHandle(note);

                    setOptionsMenu(null);
                  }}
                >
                  {note.title || "Untitled"}
                </button>

                <img
                  src="/options.svg"
                  className="optionsIcon"
                  alt="Note options"
                  onClick={() => setOptionsMenu(optionsMenu === noteKey ? null : noteKey)}
                />

                {optionsMenu === noteKey && (
                  <div className="noteOptions">
                    <button
                      className="deleteNote"
                      onClick={() => deleteNote(note)}
                      disabled={deletingNote}
                    >
                      {deletingNote ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button className="logout" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="mainArea">
        <div
          className="topBar"
          style={{
            justifyContent: sideBarToggle ? "flex-end" : "space-between",
          }}
        >
          {!sideBarToggle && (
            <img
              className="sidebarOpen"
              src="/sidebar-open.svg"
              alt="Open sidebar"
              onClick={() => {
                setSidebarToggle(true);
                setOptionsMenu(null);
              }}
            />
          )}

          <ThemeToggle />
        </div>

        <div className="showArea">
          <div className="formNote">
            <textarea
              className="newContent"
              onChange={handleEditorChange}
              onBlur={saveCurrentNoteImmediately}
              value={editorContent}
              placeholder={selectedNote ? "" : "What's on your mind?"}
            />

            {selectedNote && (
              <small className="saveStatus">
                {saveStatus === "saving" && "Saving..."}

                {saveStatus === "saved" && "Saved"}

                {saveStatus === "unsaved" && "Unsaved changes"}

                {saveStatus === "error" && "Couldn't save"}
              </small>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
