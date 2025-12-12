import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Users, Shield, MoreVertical, Trash2, Edit3, UserCheck, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getRoleLabel } from '../../utils/permissions';

import EmployeeEditorModal from '../../components/modals/EmployeeEditorModal';

const TeamView = ({ user, userProfile, showNotification, workspaceId }) => {
    const navigate = useNavigate();
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingMember, setEditingMember] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    useEffect(() => {
        fetchTeamMembers();
    }, [workspaceId]);

    const fetchTeamMembers = async () => {
        if (!workspaceId) return;
        setLoading(true);
        try {
            // 1. Fetch active profiles
            const qProfiles = query(collection(db, 'users_profiles'), where('ownerId', '==', workspaceId));
            const snapshotProfiles = await getDocs(qProfiles);
            const activeMembers = snapshotProfiles.docs.map(doc => ({ id: doc.id, ...doc.data(), status: 'active' }));

            // 2. Fetch pending invites
            const qInvites = query(collection(db, 'workspace_invites'), where('ownerId', '==', workspaceId));
            const snapshotInvites = await getDocs(qInvites);
            const pendingInvites = snapshotInvites.docs.map(doc => ({ id: doc.id, ...doc.data(), status: 'pending', isInvite: true }));

            // Combine
            setTeamMembers([...activeMembers, ...pendingInvites]);
        } catch (error) {
            console.error("Error fetching team:", error);
            showNotification('error', "Erreur chargement équipe");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (member) => {
        setEditingMember(member);
        setIsEditorOpen(true);
    };

    const handleInvite = () => {
        setEditingMember({}); // Empty object for new member
        setIsEditorOpen(true);
    };

    const handleDelete = async (member) => {
        const isInvite = member.isInvite;
        if (!confirm(`Voulez-vous vraiment retirer ${member.email} de l'équipe ?`)) return;

        try {
            if (isInvite) {
                await deleteDoc(doc(db, 'workspace_invites', member.id)); // ID is email usually
            } else {
                await deleteDoc(doc(db, 'users_profiles', member.id));
            }
            showNotification("Membre retiré");
            fetchTeamMembers();
        } catch (e) {
            console.error(e);
            showNotification("Erreur lors de la suppression", "error");
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white px-4 py-3 border-b flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/profile')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">Gestion d'équipe</h1>
                </div>
                <button
                    onClick={handleInvite}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Inviter un membre</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-4">

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Users size={20} className="text-indigo-600" />
                                </div>
                                <span className="2xl font-bold text-slate-800">{teamMembers.length}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Membres totaux</p>
                        </div>
                        {/* Other stats can go here */}
                    </div>

                    {/* Team List */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <Shield size={18} className="text-slate-400" />
                                Membres de l'équipe
                            </h2>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Chargement...</div>
                        ) : teamMembers.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                Aucun membre dans l'équipe.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {teamMembers.map((member) => (
                                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${member.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                                                }`}>
                                                {(member.email || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-800">{member.email}</p>
                                                    {member.status === 'pending' && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200 font-bold uppercase tracking-wider">
                                                            Invité
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${member.role === 'admin'
                                                            ? 'bg-purple-100 text-purple-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {getRoleLabel(member.role)}
                                                    </span>
                                                    {member.uid === user.uid && (
                                                        <span className="text-xs text-slate-400 italic">(Vous)</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {!member.isInvite && (
                                                <button
                                                    onClick={() => handleEdit(member)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            )}
                                            {member.uid !== user.uid && (
                                                <button
                                                    onClick={() => handleDelete(member)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isEditorOpen && (
                <EmployeeEditorModal
                    member={editingMember}
                    workspaceId={workspaceId}
                    onClose={() => setIsEditorOpen(false)}
                    showNotification={showNotification}
                    onUpdate={fetchTeamMembers}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default TeamView;
