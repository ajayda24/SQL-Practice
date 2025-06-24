"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { toast } from "sonner";


export default function LikeButton() {
    const [count, setCount] = useState<number | null>(null);
    const [liked, setLiked] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
      // Generate or get existing ID in browser
      let id = localStorage.getItem("sql-app-user-id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("sql-app-user-id", id);
      }
      setUserId(id);

      fetch("/api/likes")
        .then((res) => res.json())
        .then((data) => setCount(data.count));

      setLiked(localStorage.getItem("has-liked") === "true");
    }, []);

    useEffect(() => {
      fetch("/api/likes")
        .then((res) => res.json())
        .then((data) => setCount(data.count));

      const hasLiked = localStorage.getItem("has-liked") === "true";
      setLiked(hasLiked);
    }, []);

    const handleLike = async () => {
      if (liked) {
        toast.success("Already liked ❤️.");
        return
      };

      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }), // ✅ important
      });

      try {
        const data = await res.json();

        if (data.count) {
          setCount(data.count);
          setLiked(true);
          localStorage.setItem("has-liked", "true");
        } else {
          console.error("Unexpected response:", data);
        }
      } catch (err) {
        console.error("Failed to parse response:", err);
      }
    };

  return (
    <div className="text-center mt-4">
      <Button
        variant="secondary"
        onClick={handleLike}
        className=" hover:bg-red-600 hover:text-white ring-1 ring-gray-800 px-4 py-2 rounded-lg shadow"
      >
        {liked ? `❤️ Liked (${count ?? ""})` : `🤍 Like ${count ?? ""}`}
      </Button>
    </div>
  );
}
