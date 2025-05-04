'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { useRouter } from 'next/navigation';
import { createAcademy, getAcademies, remove } from '@/lib/db'; // Import MongoDB operations

interface Academy {
    id: string;
    name: string;
}

export default function AcademyManagement() {
    const [academies, setAcademies] = useState<Academy[]>([]);
    const [newAcademyName, setNewAcademyName] = useState('');
    const [generatedId, setGeneratedId] = useState('');
    const { user } = useAuth(); // Get the current user
    const router = useRouter();

    useEffect(() => {
        if (!user || user.role !== 'owner') {
            console.error('Unauthorized access. Redirecting...');
            router.push('/auth'); // Redirect if not an owner
        }
    }, [user, router]);

    // Load academies from MongoDB
    useEffect(() => {
        const loadAcademies = async () => {
            try {
                const response = await getAcademies();
                console.log('Academies response:', response);

                if (Array.isArray(response)) {
                    setAcademies(response);
                } else {
                    console.error('Unexpected response format:', response);
                    setAcademies([]);
                }
            } catch (error) {
                console.error('Error loading academies:', error);
                setAcademies([]);
            }
        };

        loadAcademies();
    }, []);

    const generateUniqueId = () => {
        setGeneratedId(Math.random().toString(36).substr(2, 15));
    };

    const handleAddAcademy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (generatedId && newAcademyName) {
            const newAcademy = { id: generatedId, name: newAcademyName };
            try {
                const createdAcademy = await createAcademy(newAcademy); // Save to MongoDB
                if (createdAcademy) {
                    setAcademies((prev) => [...prev, createdAcademy]);
                    setNewAcademyName('');
                    setGeneratedId('');
                } else {
                    console.error('Failed to add academy: No data returned');
                }
            } catch (error) {
                console.error('Error adding academy:', error);
            }
        } else {
            console.error('Academy ID or name is missing');
        }
    };

    const handleDeleteAcademy = async (id: string) => {
        try {
            console.log(`Attempting to delete academy with ID: ${id}`);
            await remove('ams-academy', id); // Remove from MongoDB
            console.log(`Successfully deleted academy with ID: ${id}`);
            setAcademies((prev) => prev.filter((academy) => academy.id !== id));
        } catch (error) {
            console.error(`Error deleting academy with ID ${id}:`, error);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-900">
            <Sidebar /> {/* Ensure Sidebar is displayed */}
            <div className="flex-1 p-8">
                <div className="bg-gray-800 rounded-lg shadow-md p-6">
                    <form onSubmit={handleAddAcademy} className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-4">
                                <button 
                                    type="button"
                                    onClick={generateUniqueId}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Generate ID
                                </button>
                                <span className="text-white">{generatedId}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <input 
                                type="text" 
                                value={newAcademyName} 
                                onChange={(e) => setNewAcademyName(e.target.value)}
                                placeholder="Academy Name"
                                className="w-full px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button 
                                type="submit"
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                                Add Academy
                            </button>
                        </div>
                    </form>
                    <div className="mt-6">
                        <table className="w-full text-left text-white">
                            <thead>
                                <tr>
                                    <th className="px-4 py-2">Academy ID</th>
                                    <th className="px-4 py-2">Academy Name</th>
                                    <th className="px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(academies) && academies.map((academy: Academy) => (
                                    <tr key={academy.id} className="bg-gray-700">
                                        <td className="px-4 py-2">{academy.id}</td>
                                        <td className="px-4 py-2">{academy.name}</td>
                                        <td className="px-4 py-2">
                                            <button 
                                                onClick={() => handleDeleteAcademy(academy.id)}
                                                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
