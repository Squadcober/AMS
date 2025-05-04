"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import Sidebar from "@/components/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export default function ExportDataPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [selectedData, setSelectedData] = useState<string[]>([])

  const exportOptions = [
    { id: 'players', label: 'Players Data' },
    { id: 'coaches', label: 'Coaches Data' },
    { id: 'batches', label: 'Batches Data' },
    { id: 'performance', label: 'Performance History' },
    { id: 'finances', label: 'Financial Records' },
    { id: 'all', label: 'All Data' }
  ]

  const formatCSV = (data: any[], type: string) => {
    if (!data.length) return '';
    
    let headers: string[] = [];
    let rows: string[][] = [];

    switch (type) {
      case 'players':
        headers = ['ID', 'Name', 'Position', 'Age', 'Overall Rating', ...Object.keys(data[0]?.attributes || {})];
        rows = data.map(p => [
          p.id,
          p.name,
          p.position,
          p.age,
          p.attributes?.overall,
          ...Object.values(p.attributes || {})
        ]);
        break;

      case 'coaches':
        headers = ['ID', 'Name', 'Email', 'Specialization', 'Experience', 'Rating'];
        rows = data.map(c => [
          c.id,
          c.name,
          c.email,
          c.specialization,
          c.experience,
          c.rating
        ]);
        break;

      case 'performance':
        headers = ['Player ID', 'Player Name', 'Date', 'Rating', 'Notes'];
        rows = data.map(p => [
          p.playerId,
          p.playerName,
          p.date,
          p.rating,
          p.notes
        ]);
        break;

      // Add more cases for other data types
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleExport = async (type: string) => {
    try {
      setLoading(prev => ({ ...prev, [type]: true }));

      const response = await fetch(`/api/db/export?academyId=${user?.academyId}&collection=${type}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      
      if (type === 'all') {
        // Export each collection separately
        Object.entries(data).forEach(([collection, collectionData]) => {
          const csvContent = formatCSV(collectionData as any[], collection);
          downloadCSV(csvContent, `${collection}_${new Date().toISOString()}.csv`);
        });
      } else {
        const csvContent = formatCSV(data, type);
        downloadCSV(csvContent, `${type}_${new Date().toISOString()}.csv`);
      }

      toast({
        title: "Success",
        description: "Data exported successfully",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">Export Data</h1>

        <Card>
          <CardHeader>
            <CardTitle>Select Data to Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exportOptions.map(option => (
                <Card key={option.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedData.includes(option.id)}
                        onCheckedChange={(checked) => {
                          setSelectedData(prev =>
                            checked
                              ? [...prev, option.id]
                              : prev.filter(id => id !== option.id)
                          );
                        }}
                      />
                      <span>{option.label}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(option.id)}
                      disabled={loading[option.id]}
                    >
                      {loading[option.id] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        'Export'
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Button
              className="w-full"
              disabled={selectedData.length === 0 || Object.values(loading).some(Boolean)}
              onClick={() => {
                selectedData.forEach(type => handleExport(type));
              }}
            >
              {Object.values(loading).some(Boolean) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting Selected...
                </>
              ) : (
                `Export Selected (${selectedData.length})`
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

