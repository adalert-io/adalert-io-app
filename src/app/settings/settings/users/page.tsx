"use client";
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Search, Trash2, Edit2, User, ChevronDown } from 'lucide-react';

const USERS = [
  { email: 'info@webds.com', name: 'Ashar Elran', accessLevel: 'Admin', access: 'All ad accounts' },
  { email: 'janica@webds.com', name: 'Janica', accessLevel: 'Manager', access: 'All ad accounts' },
  { email: 'mzhou@decodifi.uk', name: 'Ming', accessLevel: 'Admin', access: 'All ad accounts' },
];

const ADS_ACCOUNTS = [
  'Better Barber',
  'McGrath Kavinoky LLP',
  'Meehan Law',
  // ... more accounts
];

export default function UsersSubtab() {
  const [screen, setScreen] = useState<'list' | 'add'>('list');
  const [role, setRole] = useState<'Admin' | 'Manager'>('Admin');
  const [adsDropdownOpen, setAdsDropdownOpen] = useState(false);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);

  return (
    <div className="bg-white rounded-2xl shadow-md p-8 min-h-[600px]">
      {screen === 'list' && (
        <>
          <h2 className="text-2xl font-bold mb-1">Users</h2>
          <p className="text-gray-500 mb-6">Add, remove, or edit user including user access level and accounts access.</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto justify-center text-blue-600 font-semibold bg-blue-50 border-blue-200" onClick={() => setScreen('add')}>
              <User className="w-5 h-5" /> Add New User
            </Button>
            <div className="flex-1 flex items-center justify-end gap-2">
              <div className="relative">
                <Input placeholder="Search..." className="pl-10 pr-4 w-40" />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-blue-600" />
              </div>
              <div className="relative">
                <Button variant="outline" className="flex items-center gap-2 px-4 py-2 border-blue-200 text-blue-600 font-semibold bg-white">
                  25 rows <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
                {/* Dropdown for rows per page (not implemented) */}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-left text-base">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-500">Email</th>
                  <th className="px-6 py-3 font-semibold text-gray-500">Name</th>
                  <th className="px-6 py-3 font-semibold text-gray-500">Access Level</th>
                  <th className="px-6 py-3 font-semibold text-gray-500">Access</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {USERS.map((user, i) => (
                  <tr key={user.email} className="border-b last:border-0">
                    <td className="px-6 py-3 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-3 whitespace-nowrap">{user.name}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`inline-block px-3 py-1 rounded-md text-white text-xs font-bold ${user.accessLevel === 'Admin' ? 'bg-blue-700' : 'bg-blue-400'}`}>{user.accessLevel}</span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">{user.access}</td>
                    <td className="px-6 py-3 flex gap-2 items-center">
                      <button className="text-blue-600 hover:text-blue-800"><Edit2 className="w-5 h-5" /></button>
                      <button className="text-red-500 hover:text-red-700"><Trash2 className="w-5 h-5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <span>Go to page:</span>
            <select className="border rounded px-2 py-1 text-base">
              <option>1</option>
            </select>
            <span>Page 1 of 1</span>
            <button className="text-gray-400 px-1">{'|<'}</button>
            <button className="text-gray-400 px-1">{'<'}</button>
            <button className="text-gray-400 px-1">{'>'}</button>
            <button className="text-gray-400 px-1">{'>|'}</button>
          </div>
        </>
      )}
      {screen === 'add' && (
        <div className="w-full">
          <button className="flex items-center gap-2 text-blue-600 mb-6" onClick={() => setScreen('list')}>
            <ChevronLeft className="w-5 h-5" /> Back to Accounts
          </button>
          <h2 className="text-2xl font-bold mb-6">Add New User</h2>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 flex flex-col gap-4 max-w-md">
              <div className="relative">
                <Input placeholder="Email" className="pl-10" />
                <User className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
              </div>
              {/* Role dropdown */}
              <div className="relative">
                <button type="button" className="flex items-center w-full border rounded-md px-3 py-2 bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-200" onClick={() => setRole(role === 'Admin' ? 'Manager' : 'Admin')}>
                  <span className="flex items-center gap-2"><User className="w-5 h-5 text-blue-400" /> {role}</span>
                  <ChevronDown className="ml-auto w-4 h-4 text-blue-400" />
                </button>
                {/* Dropdown options (mock) */}
                {/* <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg">...</div> */}
              </div>
              {/* Ads accounts dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className={`flex items-center w-full border rounded-md px-3 py-2 bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 ${role === 'Admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={role === 'Admin'}
                  onClick={() => role === 'Manager' && setAdsDropdownOpen(v => !v)}
                >
                  <span className="flex items-center gap-2"><User className="w-5 h-5 text-blue-400" />
                    {role === 'Admin' ? 'All Ad Accounts' : `${selectedAds.length}/6 selected`}
                  </span>
                  <ChevronDown className="ml-auto w-4 h-4 text-blue-400" />
                </button>
                {/* Multi-select dropdown (mock) */}
                {adsDropdownOpen && role === 'Manager' && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Input placeholder="Search for ads accounts" className="h-8" />
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-xs text-blue-600">
                      <button className="underline" onClick={() => setSelectedAds(ADS_ACCOUNTS)}>Select All</button>
                      <button className="underline" onClick={() => setSelectedAds([])}>Clear All</button>
                    </div>
                    <div className="max-h-32 overflow-y-auto flex flex-col gap-1">
                      {ADS_ACCOUNTS.map(acc => (
                        <label key={acc} className="flex items-center gap-2 cursor-pointer text-base">
                          <input
                            type="checkbox"
                            checked={selectedAds.includes(acc)}
                            onChange={() => setSelectedAds(selectedAds.includes(acc) ? selectedAds.filter(a => a !== acc) : [...selectedAds, acc])}
                          />
                          {acc}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button className="bg-blue-300 text-white text-lg font-bold px-12 py-3 rounded shadow-md mt-4" disabled>Save</Button>
            </div>
            {/* Avatar placeholder */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-48 h-48 border rounded-xl flex items-center justify-center bg-gray-50">
                <User className="w-24 h-24 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 