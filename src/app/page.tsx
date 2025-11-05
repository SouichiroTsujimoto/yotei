import Calendar from "@/components/Calendar";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 py-12">
      <main className="container mx-auto px-4">
        <h1 className="text-2xl font-bold text-center mb-8 text-white">
          候補日を選択してください
        </h1>
        <Calendar />
      </main>
    </div>
  );
}
