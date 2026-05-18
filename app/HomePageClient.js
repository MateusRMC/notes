"use client";

import Link from "next/link";

export default function HomePageClient() {
  return (
    <div
      className="homeWrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        margin: "10px auto",
        width: "95%",
      }}
    >
      <div
        className="homeHero"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: "8",
          width: "100%",
          textAlign: "center",
        }}
      >
        <img
          src="/simplenotes.jpg"
          style={{ width: "80%", maxWidth: "500px", margin: "20px auto" }}
        />

        <p>Write and nothing more.</p>
      </div>
      <div
        className="homeCTA"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: "2",
          width: "100%",
        }}
      >
        <Link
          href="/auth"
          style={{
            backgroundColor: "#000",
            color: "white",
            width: "90%",
            padding: "20px",
            textAlign: "center",
            maxWidth: "300px",
            textDecoration: "none",
            borderRadius: "10px",
            margin: "0px auto",
          }}
        >
          Get started
        </Link>
      </div>
    </div>
  );
}
