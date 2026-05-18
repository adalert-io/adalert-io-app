"use client";

import MyProfileTab from "@/app/settings/my-profile/page";

export default function ConsumerMyProfilePage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-md sm:p-6">
        <MyProfileTab />
      </div>
    </div>
  );
}
