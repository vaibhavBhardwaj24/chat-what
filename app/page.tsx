import { Sidebar } from "@/components/Sidebar";

export default function Home() {
  return (
    <div className="flex flex-1 overflow-hidden w-full h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-gray-700">Welcome to ChatApp</h2>
          <p>Select a user from the sidebar to start a conversation.</p>
        </div>
      </div>
    </div>
  );
}
