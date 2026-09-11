"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "../lib/themeToggle";
import { useRouter } from "next/navigation";

export default function NotesPageClient({ user }) {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // React state: things that affect what the user sees
  // ---------------------------------------------------------------------------

  const [notes, setNotes] = useState([]);
  const [editorContent, setEditorContent] = useState("");
  const [activeNoteKey, setActiveNoteKey] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");

  const [deletingNote, setDeletingNote] = useState(false);
  const [notesList, setNotesList] = useState(true);
  const [sideBarToggle, setSidebarToggle] = useState(false);
  const [optionsMenu, setOptionsMenu] = useState(null);

  // ---------------------------------------------------------------------------
  // Refs: internal autosave machinery that should not cause renders
  // ---------------------------------------------------------------------------

  const autosaveTimeoutRef = useRef(null);

  // We keep this ref in sync with activeNoteKey so async saves can safely check
  // whether they are still saving the note currently visible in the editor.
  const activeNoteKeyRef = useRef(null);

  /*
    One single Map contains the internal save state of every note.

    noteSessionsRef.current.get(noteKey) => {
      id,             // database ID; null until the first POST succeeds
      latestContent,  // newest text currently typed by the user
      savedContent,   // exact text confirmed as saved by the server
      savePromise,    // current save operation, or null
      deleted,        // prevents an in-flight save from resurrecting a deleted note
    }

    The noteKey never changes during the lifetime of the page.
    A temporary note starts with a UUID. After POST returns an ID, only session.id
    changes; the noteKey stays the same.
  */
  const noteSessionsRef = useRef(new Map());

  // Prevents an older GET response from replacing a newer sidebar refresh.
  const notesRefreshVersionRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  function getTitleFromContent(content) {
    return content.split(/\r?\n/)[0].trim();
  }

  function getNoteKey(note) {
    if (!note) return null;

    return note.clientId ?? `db-${note.id}`;
  }

  function getSession(noteKey) {
    if (!noteKey) return null;

    return noteSessionsRef.current.get(noteKey) ?? null;
  }

  function ensureSessionForNote(note) {
    const noteKey = getNoteKey(note);

    if (!noteKey) return null;

    const existingSession = noteSessionsRef.current.get(noteKey);

    if (existingSession) {
      // If this note just received its database ID, keep the same local key and
      // simply attach the database ID to its existing session.
      if (existingSession.id == null && note.id != null) {
        existingSession.id = note.id;
      }

      return existingSession;
    }

    const session = {
      id: note.id ?? null,
      latestContent: note.content ?? "",
      savedContent: note.id != null ? (note.content ?? "") : undefined,
      savePromise: null,
      deleted: false,
    };

    noteSessionsRef.current.set(noteKey, session);

    return session;
  }

  function setActiveNote(noteKey) {
    activeNoteKeyRef.current = noteKey;
    setActiveNoteKey(noteKey);
  }

  function setStatusForNote(noteKey, status) {
    if (activeNoteKeyRef.current === noteKey) {
      setSaveStatus(status);
    }
  }

  function clearAutosaveTimer() {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Sidebar/server refresh
  // ---------------------------------------------------------------------------

  async function refreshNotesList() {
    const refreshVersion = ++notesRefreshVersionRef.current;

    const req = await fetch("/api/notes/");

    if (!req.ok) {
      console.error("Erro ao buscar notas");
      return;
    }

    const serverNotes = await req.json();

    // If a newer refresh started while this request was travelling, ignore this
    // older response.
    if (refreshVersion !== notesRefreshVersionRef.current) {
      return;
    }

    setNotes((currentNotes) => {
      const refreshedServerNotes = serverNotes.map((serverNote) => {
        /*
          Try to match this database note with an existing local note.

          This is especially important after creating a new note:
          - locally it may have key "550e8400-..."
          - in the database it may now have id 123
          - we DO NOT want to replace its local key with "db-123" mid-session.
        */
        const existingLocalNote = currentNotes.find((localNote) => {
          const localKey = getNoteKey(localNote);
          const localSession = getSession(localKey);
          const localDatabaseId = localSession?.id ?? localNote.id;

          return localDatabaseId === serverNote.id;
        });

        const clientId = existingLocalNote?.clientId ?? `db-${serverNote.id}`;

        const noteKey = clientId;

        let session = getSession(noteKey);

        if (!session) {
          // This is a normal note loaded from the database for the first time.
          session = {
            id: serverNote.id,
            latestContent: serverNote.content ?? "",
            savedContent: serverNote.content ?? "",
            savePromise: null,
            deleted: false,
          };

          noteSessionsRef.current.set(noteKey, session);
        } else {
          session.id = serverNote.id;
        }

        /*
          If the note already exists locally, local text wins.

          A GET may have started before the latest PATCH finished, so even when
          latestContent === savedContent we do not let an older GET roll the UI
          backwards to stale server text.
        */
        if (existingLocalNote) {
          const localContent = session.latestContent ?? existingLocalNote.content ?? "";

          return {
            ...serverNote,
            clientId,
            isTemporary: false,
            title: getTitleFromContent(localContent),
            content: localContent,
          };
        }

        return {
          ...serverNote,
          clientId,
          isTemporary: false,
        };
      });

      const serverIds = new Set(serverNotes.map((note) => note.id));

      /*
        Keep notes that only exist locally.

        This protects the exact scenario where the app opens, GET /notes starts,
        and the user immediately begins a new note before that GET returns.
      */
      const localOnlyNotes = currentNotes.filter((localNote) => {
        const noteKey = getNoteKey(localNote);
        const session = getSession(noteKey);

        if (session?.deleted) {
          return false;
        }

        const databaseId = session?.id ?? localNote.id;

        if (databaseId == null) {
          return true;
        }

        return !serverIds.has(databaseId);
      });

      return [...localOnlyNotes, ...refreshedServerNotes];
    });
  }

  // ---------------------------------------------------------------------------
  // Local note editing
  // ---------------------------------------------------------------------------

  function createTemporaryNote(content) {
    const clientId = crypto.randomUUID();

    const temporaryNote = {
      id: null,
      clientId,
      title: getTitleFromContent(content),
      content,
      isTemporary: true,
    };

    noteSessionsRef.current.set(clientId, {
      id: null,
      latestContent: content,
      savedContent: undefined,
      savePromise: null,
      deleted: false,
    });

    setNotes((currentNotes) => [temporaryNote, ...currentNotes]);

    setActiveNote(clientId);

    setSaveStatus("unsaved");

    return clientId;
  }

  function updateLocalNote(noteKey, content) {
    const session = getSession(noteKey);

    if (!session || session.deleted) {
      return;
    }

    session.latestContent = content;

    const title = getTitleFromContent(content);

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
  }

  // ---------------------------------------------------------------------------
  // Saving
  // ---------------------------------------------------------------------------

  async function runSaveLoop(noteKey, session) {
    try {
      while (!session.deleted) {
        /*
          Snapshot the exact version we are about to send.

          If the user types more while the request is happening,
          session.latestContent will change, but contentToSave won't.
        */
        const contentToSave = session.latestContent ?? "";

        const databaseId = session.id;

        // Do not create a blank temporary note.
        if (databaseId == null && !contentToSave.trim()) {
          return;
        }

        // Nothing changed since the last successful request.
        if (contentToSave === session.savedContent) {
          setStatusForNote(noteKey, "saved");

          return;
        }

        setStatusForNote(noteKey, "saving");

        const title = getTitleFromContent(contentToSave);

        if (databaseId == null) {
          /*
            FIRST SAVE.

            The note exists locally but does not have a database ID yet,
            so we create it with POST.
          */
          const req = await fetch("/api/notes/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title,
              content: contentToSave,
            }),
          });

          if (!req.ok) {
            throw new Error("Erro ao criar nota");
          }

          const response = await req.json();

          /*
            Supports:

            {
              id: 123
            }

            or:

            {
              note: {
                id: 123
              }
            }
          */
          const createdNote = response.note ?? response;

          if (createdNote.id == null) {
            throw new Error("POST /api/notes precisa retornar o ID da nota criada");
          }

          const createdId = createdNote.id;

          /*
            Critical transition:

            The local note keeps the SAME noteKey, but from this moment onward
            session.id exists.

            Every future save therefore uses PATCH instead of POST.
          */
          session.id = createdId;

          /*
            Only this exact snapshot was confirmed by the server.

            If the user typed while POST was happening,
            latestContent may already contain something newer.
          */
          session.savedContent = contentToSave;

          /*
            If the user deleted the note while POST was in flight,
            remove the just-created row immediately instead of resurrecting it.
          */
          if (session.deleted) {
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

          /*
            Attach the database ID to the existing local note
            WITHOUT changing its clientId/local identity
            and WITHOUT replacing newer editor text.
          */
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
        } else {
          /*
            The note already has a database ID.

            Every save after the first POST is therefore PATCH.
          */
          const req = await fetch("/api/notes", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: databaseId,
              title,
              content: contentToSave,
            }),
          });

          if (!req.ok) {
            throw new Error("Erro ao atualizar nota");
          }

          /*
            Only mark the exact snapshot sent by this PATCH as saved.
          */
          session.savedContent = contentToSave;
        }

        /*
          The user may have typed while POST/PATCH was travelling.

          Example:

          request saves:
          "Hello"

          while request is happening, user types:
          "Hello world"

          When the request returns:

          savedContent = "Hello"
          latestContent = "Hello world"

          They are different, so we loop again and save the newer version.
        */
        if (session.latestContent !== session.savedContent) {
          continue;
        }

        setStatusForNote(noteKey, "saved");

        /*
          Update ordering/sidebar data.

          refreshNotesList() is intentionally NOT awaited.

          Saving is finished already, so we let this save promise end.
        */
        void refreshNotesList();

        return;
      }
    } catch (error) {
      console.error("Erro ao salvar nota:", error);

      setStatusForNote(noteKey, "error");
    }
  }

  function persistNote(noteKey) {
    if (!noteKey) {
      return Promise.resolve();
    }

    const session = getSession(noteKey);

    if (!session || session.deleted) {
      return Promise.resolve();
    }

    /*
      Only ONE save loop per note at a time.

      If a request is already running, we do not start another parallel one.

      The existing runSaveLoop will notice latestContent changed
      and save the newer version itself.
    */
    if (session.savePromise) {
      return session.savePromise;
    }

    const savePromise = runSaveLoop(noteKey, session);

    /*
      IMPORTANT BUG FIX:

      Register the promise BEFORE scheduling its cleanup.

      Promise.finally() always happens after this synchronous assignment,
      even if runSaveLoop() returns immediately.

      So a completed Promise cannot get stuck forever in savePromise.
    */
    session.savePromise = savePromise;

    void savePromise.finally(() => {
      if (session.savePromise === savePromise) {
        session.savePromise = null;
      }

      /*
        A temporary note may have been deleted while its POST was in flight.
        When everything finishes we can finally remove its session.
      */
      if (session.deleted) {
        noteSessionsRef.current.delete(noteKey);
      }
    });

    return savePromise;
  }

  function scheduleAutosave(noteKey) {
    /*
      Every new keystroke cancels the old timer.
    */
    clearAutosaveTimer();

    const session = getSession(noteKey);

    if (!session || session.deleted) {
      return;
    }

    /*
      If current content is exactly what the server already confirmed,
      there is nothing to save.
    */
    if (session.latestContent === session.savedContent) {
      setStatusForNote(noteKey, "saved");

      return;
    }

    setStatusForNote(noteKey, "unsaved");

    /*
      Wait 700ms after the last keystroke.

      If another keystroke happens before this,
      scheduleAutosave() will cancel this timer
      and create another one.
    */
    autosaveTimeoutRef.current = setTimeout(() => {
      autosaveTimeoutRef.current = null;

      void persistNote(noteKey);
    }, 700);
  }

  function saveCurrentNoteImmediately() {
    clearAutosaveTimer();

    const noteKey = activeNoteKeyRef.current;

    if (!noteKey) {
      return Promise.resolve();
    }

    const session = getSession(noteKey);

    if (!session || session.deleted) {
      return Promise.resolve();
    }

    /*
      Don't create a totally blank temporary note.
    */
    if (session.id == null && !(session.latestContent ?? "").trim()) {
      return Promise.resolve();
    }

    return persistNote(noteKey);
  }

  function finishCurrentNote() {
    clearAutosaveTimer();

    const noteKey = activeNoteKeyRef.current;

    if (!noteKey) {
      return;
    }

    const session = getSession(noteKey);

    if (!session || session.deleted) {
      return;
    }

    const content = session.latestContent ?? "";

    /*
      If a brand-new note was completely erased before ever reaching the DB,
      discard it instead of creating an empty row.
    */
    if (session.id == null && !content.trim()) {
      session.deleted = true;

      setNotes((currentNotes) => currentNotes.filter((note) => getNoteKey(note) !== noteKey));

      if (!session.savePromise) {
        noteSessionsRef.current.delete(noteKey);
      }

      return;
    }

    /*
      Navigation stays instant.

      We don't make the user wait for the request before opening another note.
    */
    void persistNote(noteKey);
  }

  // ---------------------------------------------------------------------------
  // Editor/navigation handlers
  // ---------------------------------------------------------------------------

  function handleEditorChange(e) {
    const content = e.target.value;

    /*
      The textarea itself updates immediately.
    */
    setEditorContent(content);

    let noteKey = activeNoteKeyRef.current;

    /*
      There is currently no note.

      The first meaningful character creates one locally.
    */
    if (!noteKey) {
      /*
        Do not create a note if the user typed only spaces/newlines.
      */
      if (!content.trim()) {
        return;
      }

      noteKey = createTemporaryNote(content);

      scheduleAutosave(noteKey);

      return;
    }

    /*
      Existing note.

      Update its local copy immediately.
    */
    updateLocalNote(noteKey, content);

    /*
      Then restart the 700ms autosave timer.
    */
    scheduleAutosave(noteKey);
  }

  function noteListHandle(note) {
    const noteKey = getNoteKey(note);

    const session = ensureSessionForNote(note);

    if (!session || session.deleted) {
      return;
    }

    /*
      This note is now the note currently open in the editor.
    */
    setActiveNote(noteKey);

    /*
      Use latestContent instead of blindly using note.content.

      latestContent may contain newer local text that has not reached
      the server yet.
    */
    setEditorContent(session.latestContent ?? note.content ?? "");

    /*
      Display the correct current save state.
    */
    setSaveStatus(session.latestContent === session.savedContent ? "saved" : "unsaved");

    const isPortrait = window.matchMedia("(orientation: portrait)").matches;

    if (isPortrait) {
      setSidebarToggle(false);
    }
  }

  function createNewNoteHandle() {
    /*
      There is intentionally NO note yet.

      A temporary note will only be created when the user starts typing.
    */
    setActiveNote(null);

    setEditorContent("");

    setSaveStatus("saved");

    const isPortrait = window.matchMedia("(orientation: portrait)").matches;

    if (isPortrait) {
      setSidebarToggle(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function deleteNote(note) {
    setDeletingNote(true);

    const noteKey = getNoteKey(note);

    const session = ensureSessionForNote(note);

    if (!session) {
      setDeletingNote(false);

      return;
    }

    /*
      From this moment on, autosave must stop touching this note.
    */
    session.deleted = true;

    if (activeNoteKeyRef.current === noteKey) {
      clearAutosaveTimer();
    }

    const databaseId = session.id ?? note.id;

    /*
      Remove it from the UI immediately.
    */
    setNotes((currentNotes) =>
      currentNotes.filter((currentNote) => getNoteKey(currentNote) !== noteKey),
    );

    if (activeNoteKeyRef.current === noteKey) {
      setActiveNote(null);

      setEditorContent("");

      setSaveStatus("saved");
    }

    setOptionsMenu(null);

    /*
      CASE 1:
      This note never reached the database.

      There is nothing to DELETE from the server.
    */
    if (databaseId == null) {
      setDeletingNote(false);

      /*
        If POST is already in flight,
        runSaveLoop() will delete the newly-created database row
        as soon as POST returns.

        Otherwise we can forget the local session immediately.
      */
      if (!session.savePromise) {
        noteSessionsRef.current.delete(noteKey);
      }

      return;
    }

    /*
      CASE 2:
      The note exists in the database.

      Delete the actual database row.
    */
    const req = await fetch("/api/notes", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: databaseId,
      }),
    });

    if (!req.ok) {
      console.error("Erro ao deletar nota");

      /*
        DELETE failed.

        The row still exists on the server,
        so restore the local note rather than pretending deletion succeeded.
      */
      session.deleted = false;

      setNotes((currentNotes) => {
        const alreadyRestored = currentNotes.some(
          (currentNote) => getNoteKey(currentNote) === noteKey,
        );

        if (alreadyRestored) {
          return currentNotes;
        }

        return [
          {
            ...note,

            id: databaseId,

            clientId: note.clientId ?? noteKey,

            title: getTitleFromContent(session.latestContent ?? note.content ?? ""),

            content: session.latestContent ?? note.content ?? "",

            isTemporary: false,
          },

          ...currentNotes,
        ];
      });

      setDeletingNote(false);

      return;
    }

    /*
      DELETE succeeded.

      We no longer need its session.
    */
    noteSessionsRef.current.delete(noteKey);

    setDeletingNote(false);

    /*
      Refresh sidebar/order after deletion.
    */
    void refreshNotesList();
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  async function logout() {
    /*
      Unlike regular navigation, logout waits for the current note
      to finish saving before destroying the session.
    */
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

  // ---------------------------------------------------------------------------
  // Initial load / cleanup
  // ---------------------------------------------------------------------------

  useEffect(() => {
    /*
      Load notes when the component mounts.

      refreshNotesList() MERGES server state with local state,
      so a note created while this GET is running cannot disappear.
    */
    void refreshNotesList();

    return () => {
      clearAutosaveTimer();
    };
  }, []);

  /*
    The selected note is DERIVED from one source of truth: activeNoteKey.

    We do not keep a separate selectedNote object in state anymore.

    That avoids situations where:

      notes = version A

    but:

      selectedNote = version B
  */
  const selectedNote = notes.find((note) => getNoteKey(note) === activeNoteKey) ?? null;

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
              style={{
                cursor: "pointer",
              }}
              src="/sidebar-close.svg"
              alt="Close sidebar"
              onClick={() => setSidebarToggle(false)}
            />
          )}
        </div>

        <button
          className="addNoteButton"
          onClick={() => {
            /*
              Save whatever note we're leaving.
            */
            finishCurrentNote();

            /*
              Then immediately show an empty editor.
            */
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
                    /*
                      Start saving the note we're leaving.
                    */
                    finishCurrentNote();

                    /*
                      Open the clicked note.
                    */
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
            justifyContent: "space-between",
          }}
        >
          {!sideBarToggle && (
            <img
              className="sidebarOpen"
              src="/sidebar-open.svg"
              style={{
                cursor: "pointer",
              }}
              alt="Open sidebar"
              onClick={() => {
                setSidebarToggle(true);

                setOptionsMenu(null);
              }}
            />
          )}

          {selectedNote === null && sideBarToggle === true && (
            <small
              style={{
                color: "transparent",
              }}
            >
              .
            </small>
          )}

          {selectedNote && (
            <small className="saveStatus">
              {saveStatus === "saving" && "Saving..."}

              {saveStatus === "saved" && "Saved"}

              {saveStatus === "unsaved" && "Unsaved changes"}

              {saveStatus === "error" && "Couldn't save"}
            </small>
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
          </div>
        </div>
      </div>
    </>
  );
}
