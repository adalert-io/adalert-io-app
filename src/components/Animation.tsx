import { useEffect } from "react";

export default function AnimatedGrid() {
  useEffect(() => {
    const squares = document.querySelectorAll(".grid-square");
    const interval = setInterval(() => {
      const randomSquare =
        squares[Math.floor(Math.random() * squares.length)];
      randomSquare?.classList.add("highlight");
      setTimeout(() => randomSquare?.classList.remove("highlight"), 1000);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden md:flex relative items-center justify-center bg-white overflow-hidden shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.1)]">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 grid grid-cols-[repeat(auto-fill,120px)] grid-rows-[repeat(auto-fill,120px)] animate-gridmove">
        {Array.from({ length: 200 }).map((_, i) => (
          <div
            key={i}
            className="grid-square border border-blue-200/30 transition-all duration-300"
          ></div>
        ))}
      </div>

      {/* Owner Card */}
      <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-sm border border-gray-200 z-10">
        <p className="text-gray-700 text-base mb-4">
          “We are on a mission to revolutionize the way businesses track and
          analyze their advertising campaigns — making ad monitoring{" "}
          <span className="font-semibold">smarter, faster, and effortless</span>.
          Our goal is to provide actionable insights in real-time, so you can
          focus on growth while we handle the data.”
        </p>
        <div className="flex items-center gap-3">
          <img
            src="/images/user.png"
            alt="Owner Avatar"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-gray-800">Asher Elran</p>
            <p className="text-sm text-gray-500">Founder, adAlert.io</p>
          </div>
        </div>
      </div>
    </div>
  );
}
