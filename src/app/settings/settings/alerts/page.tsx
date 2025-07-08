import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Info } from 'lucide-react';

const checkboxClass =
  'data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700';

export default function AlertsSubtab() {
  return (
    <div className="bg-white rounded-2xl shadow-md p-8">
      <h2 className="text-2xl font-bold mb-1">Alerts</h2>
      <p className="text-gray-500 text-base mb-8">Control alerts frequency, add SMS, add or remove notification categories</p>
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Card className="flex-1 p-4 border-2">
          <div className="flex flex-row items-center justify-center gap-3 w-full h-full">
            <Checkbox checked className={`mr-2 ${checkboxClass}`} id="email-alerts" />
            <label htmlFor="email-alerts" className="text-base font-medium select-none">
              Send me in <span className="font-bold">Email</span> alerts
            </label>
          </div>
        </Card>
        <Card className="flex-1 p-4 flex flex-col gap-2 border-2">
          <div className="flex items-center gap-3">
            <Checkbox checked className={`mr-3 ${checkboxClass}`} id="sms-alerts" />
            <label htmlFor="sms-alerts" className="text-base font-medium select-none">
              Send me in <span className="font-bold">SMS</span> alerts <span className="font-normal text-xs">(critical alerts only)</span>
            </label>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-7 text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-2">
            <Info className="w-4 h-4 text-blue-400" />
            Update phone or withdraw consent in{' '}
            <Link href="/settings/my-profile" className="text-blue-600 underline font-medium">My Profile</Link>
          </div>
        </Card>
      </div>
      <div className="mb-8">
        <div className="font-semibold text-lg mb-2">Severity</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="critical" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="critical" className="text-base font-medium select-none">Critical</label>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="medium" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="medium" className="text-base font-medium select-none">Medium</label>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="low" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="low" className="text-base font-medium select-none">Low</label>
            </div>
          </Card>
        </div>
      </div>
      <div className="mb-8">
        <div className="font-semibold text-lg mb-2">Level</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="account" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="account" className="text-base font-medium select-none">Account</label>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="ads" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="ads" className="text-base font-medium select-none">Ads</label>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="keyword" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="keyword" className="text-base font-medium select-none">Keyword</label>
            </div>
          </Card>
        </div>
      </div>
      <div className="mb-8">
        <div className="font-semibold text-lg mb-2">Type</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="ad-performance" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="ad-performance" className="text-base font-medium select-none">Ad Performance</label>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="budget" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="budget" className="text-base font-medium select-none">Budget</label>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="keyword-performance" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="keyword-performance" className="text-base font-medium select-none">Keyword Performance</label>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="kpi-trends" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="kpi-trends" className="text-base font-medium select-none">KPI Trends</label>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="landing-page" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="landing-page" className="text-base font-medium select-none">Landing Page</label>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="optimization-score" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="optimization-score" className="text-base font-medium select-none">Optimization Score</label>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="policy" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="policy" className="text-base font-medium select-none">Policy</label>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex flex-row items-center gap-3 w-full h-full">
              <Checkbox checked id="serving-ads" className={`mr-2 ${checkboxClass}`} />
              <label htmlFor="serving-ads" className="text-base font-medium select-none">Serving Ads</label>
            </div>
          </Card>
        </div>
      </div>
      <div className="flex justify-start mt-8">
        <Button className="bg-blue-600 text-white text-lg font-bold px-12 py-3 rounded-2xl shadow-md hover:bg-blue-700 transition-all">
          Save
        </Button>
      </div>
    </div>
  );
} 