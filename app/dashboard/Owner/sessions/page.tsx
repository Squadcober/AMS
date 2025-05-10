'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { UserRole } from '@/components/types/auth';

interface Session {
    _id: string;
    id: string; // Added to match usage in code
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    academyId: string;
    academyName?: string;
    coachName?: string;
}

export default function OwnerSessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [academyMap, setAcademyMap] = useState<Record<string, string>>({});
    const [coachMap, setCoachMap] = useState<Record<string, string>>({});
    const [visibleCount, setVisibleCount] = useState(20);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) {
            return;
        }

        if (!user) {
            router.push('/auth');
            return;
        }

        const isOwner = user.role === UserRole.OWNER;
        if (!isOwner) {
            router.push('/auth');
            return;
        }

        setIsAuthChecking(false);

        const fetchAllSessions = async () => {
            try {
                setLoading(true);
                setError(null);

                const academyRes = await fetch('/api/db/ams-academy');
                const academyData = await academyRes.json();
                if (!academyData.success) throw new Error('Failed to fetch academies');
                const academies = academyData.data;
                const academyIds = academies.map((a: any) => a.id || a._id);

                const academyMap: Record<string, string> = {};
                academies.forEach((a: any) => {
                    if (a.id) academyMap[a.id] = a.name;
                    if (a._id) academyMap[a._id] = a.name;
                });
                setAcademyMap(academyMap);

                const usersRes = await fetch('/api/db/ams-users');
                const usersData = await usersRes.json();
                const coachMap: Record<string, string> = {};
                if (usersData.success && Array.isArray(usersData.data)) {
                    usersData.data.forEach((u: any) => {
                        if (u.role === "coach" && (u.id || u._id)) {
                            coachMap[u.id || u._id] = u.name || u.username || "Coach";
                        }
                    });
                }
                setCoachMap(coachMap);

                if (!academyIds.length) {
                    setSessions([]);
                    setLoading(false);
                    return;
                }

                const sessionPromises = academyIds
                    .filter(Boolean)
                    .map((academyId: string) =>
                        fetch(`/api/db/ams-sessions?academyId=${academyId}`)
                            .then(res => res.ok ? res.json() : { success: false, data: [] })
                            .catch(() => ({ success: false, data: [] }))
                    );
                const sessionResults = await Promise.all(sessionPromises);
                const allSessions = sessionResults
                    .filter(r => r.success && Array.isArray(r.data))
                    .flatMap(r => r.data);

                const uniqueSessionsMap = new Map<string, any>();
                allSessions.forEach((session: any) => {
                    if (session && (session._id || session.id)) uniqueSessionsMap.set(session._id || session.id, session);
                });
                const uniqueSessions = Array.from(uniqueSessionsMap.values());

                const formattedSessions = (uniqueSessions || []).map((session: any) => {
                    const sessionDate = new Date(session.date);
                    const status = calculateSessionStatus(sessionDate, session.startTime, session.endTime);
                    let coachName = "";
                    if (session.createdBy && coachMap[session.createdBy]) {
                        coachName = coachMap[session.createdBy];
                    } else if (session.coachId && coachMap[session.coachId]) {
                        coachName = coachMap[session.coachId];
                    } else if (typeof session.coachName === "string") {
                        coachName = session.coachName;
                    } else {
                        coachName = "N/A";
                    }
                    return {
                        ...session,
                        id: session._id || session.id,
                        date: sessionDate.toISOString(),
                        name: session.name || "Unnamed Session",
                        academyName: academyMap[session.academyId] || session.academyId || "N/A",
                        coachName,
                        startTime: session.startTime || "00:00",
                        endTime: session.endTime || "00:00",
                        status
                    };
                });

                const sortedSessions = formattedSessions.sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                setSessions(sortedSessions);
            } catch (error) {
                console.error('Error fetching sessions:', error);
                setError('Failed to load sessions. Please try again later.');
                setSessions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAllSessions();
    }, [user, isLoading, router]);

    const calculateSessionStatus = (sessionDate: Date, startTime?: string, endTime?: string) => {
        const now = new Date();
        let start = new Date(sessionDate);
        let end = new Date(sessionDate);
        if (startTime && /^\d{1,2}:\d{2}$/.test(startTime)) {
            const [h, m] = startTime.split(':').map(Number);
            start.setHours(h, m, 0, 0);
        }
        if (endTime && /^\d{1,2}:\d{2}$/.test(endTime)) {
            const [h, m] = endTime.split(':').map(Number);
            end.setHours(h, m, 0, 0);
        }
        if (now < start) return "Upcoming";
        if (now >= start && now <= end) return "On-going";
        return "Finished";
    };

    const filteredSessions = sessions.filter(session =>
        searchTerm
            ? (session.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                session.academyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                session.coachName?.toLowerCase().includes(searchTerm.toLowerCase()))
            : true
    );

    const visibleSessions = filteredSessions.slice(0, visibleCount);

    if (isAuthChecking || loading) {
        return (
            <div className="flex min-h-screen bg-gray-900">
                <Sidebar />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="text-white text-xl">Loading sessions...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen bg-gray-900">
                <Sidebar />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="text-red-500 text-xl">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-900">
            <Sidebar />
            <div className="flex-1 p-8">
                <div className="bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-white">Sessions Overview</h1>
                        <div className="text-gray-400 text-sm">
                            Total Sessions: {sessions.length}
                        </div>
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="px-3 py-2 rounded bg-gray-700 text-white w-full max-w-xs"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-white">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="px-4 py-3">Academy Name</th>
                                    <th className="px-4 py-3">Session Name</th>
                                    <th className="px-4 py-3">Coach</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Time</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleSessions.length > 0 ? (
                                    visibleSessions.map((session) => (
                                        <tr
                                            key={session.id}
                                            className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                                        >
                                            <td className="px-4 py-3">{session.academyName || 'N/A'}</td>
                                            <td className="px-4 py-3">{session.name}</td>
                                            <td className="px-4 py-3">{session.coachName || 'N/A'}</td>
                                            <td className="px-4 py-3">
                                                {session.date ? new Date(session.date).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {session.startTime} - {session.endTime}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-sm ${
                                                    session.status === 'Upcoming'
                                                        ? 'bg-green-500'
                                                        : session.status === 'On-going'
                                                        ? 'bg-blue-500'
                                                        : 'bg-gray-500'
                                                }`}>
                                                    {session.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-3 text-center text-gray-400">
                                            {error ? 'Error loading sessions' : 'No sessions found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {filteredSessions.length > visibleCount && (
                            <div className="flex justify-center mt-4">
                                <button
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    onClick={() => setVisibleCount(c => c + 20)}
                                >
                                    View More
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

