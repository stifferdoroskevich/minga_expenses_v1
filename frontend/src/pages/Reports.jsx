import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2 } from 'lucide-react';

const Reports = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground font-normal text-base">
            <BarChart2 className="h-5 w-5" />
            Coming in Stage 2
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>This page will include:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Last 12 months bar/area chart with month-over-month % change</li>
            <li>Filter by expense type to isolate trends</li>
            <li>Monthly detail view: expenses grouped by type with EUR &amp; PYG totals</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
