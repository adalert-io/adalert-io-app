// Reviews.tsx
import React from "react";
import { Star } from "lucide-react";
import Image from "next/image";

const Reviews: React.FC = () => {
  const reviews = [
    {
      id: 1,
      text: `"Managing multiple ad accounts used to feel overwhelming, but adAlert.io changed that. The platform’s real-time alerts, easy setup, and dependable monitoring give our agency complete confidence and keep our clients consistently satisfied."`,
      image: "/images/Lauren.png",
      name: "Lauren Mitchell",
      role: "Director of Digital Strategy, Horizon Growth Agency",
      align: "self-end rotate-2",
    },
    {
      id: 2,
      text: `"As a project manager overseeing multiple clients, adAlert.io keeps our campaigns on track. The real-time monitoring gives our team confidence and our clients peace of mind."`,
      image: "/images/David.png",
      name: "David Chen",
      role: "Project Manager, Elevate Marketing Group",
      align: "self-start -rotate-2",
    },
    {
      id: 3,
      text: `"adAlert.io saves me hours every week. Instant alerts mean I can act before small issues become big problems. It’s a must-have for PPC managers."`,
      image: "/images/Johann.png",
      name: "Johann Müller",
      role: "Senior PPC Specialist, BrightPath Media",
      align: "self-end rotate-2",
    },
  ];

  return (
    <div className="hidden lg:flex relative items-center justify-center bg-white overflow-hidden shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.1)]">
      {/* Background Grid */}
      <div className="absolute inset-0 grid grid-cols-[repeat(auto-fill,120px)] grid-rows-[repeat(auto-fill,120px)] gap-0 overflow-hidden">
        {Array.from({ length: 200 }, (_, i) => (
          <div
            key={i}
            className="border border-blue-200/30 hover:border-blue-400/60 hover:bg-blue-50/20 transition-all duration-200 cursor-pointer min-h-[120px] min-w-[120px]"
          />
        ))}
      </div>

      {/* Reviews Section */}
      <div className="relative flex flex-col gap-12 max-w-5xl mx-auto px-4 z-10">
        {reviews.map((review) => (
          <div
            key={review.id}
            className={`bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg p-6 max-w-sm border border-gray-200 transform ${review.align} hover:rotate-0 transition-transform duration-300`}
          >
            <p className="text-gray-700 text-sm mb-4">{review.text}</p>
            {/* Stars */}
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 text-yellow-400 fill-yellow-400"
                />
              ))}
            </div>
            {/* Reviewer */}
            <div className="flex items-center gap-3">
              <Image
                src={review.image}
                alt={review.name}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
              <div>
                <p className="font-semibold text-gray-800 text-sm">
                  {review.name}
                </p>
                <p className="text-xs text-gray-500">{review.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reviews;
