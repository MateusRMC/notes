import Link from "next/link";

export default function HomePageClient() {
  return (
    <>
      <h1>Welcome to Simple notes</h1>
      <Link href="/auth">Get started</Link>
    </>
  );
}
