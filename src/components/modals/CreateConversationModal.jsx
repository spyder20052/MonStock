import React, { useState } from 'react';
import { X, Users, User } from 'lucide-react';
import Button from '../ui/Button';

export default function CreateConversationModal({ teamMembers, onClose, onCreate }) {
    const [conversationType, setConversationType] = useState('private'); // 'private' | 'group'
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMembers = teamMembers.filter(member =>
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.displayName || member.email)?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleParticipant = (member) => {
        if (conversationType === 'private') {
            // Pour les conversations privées, on ne peut sélectionner qu'une personne
            setSelectedParticipants([member]);
        } else {
            // Pour les groupes, on peut sélectionner plusieurs personnes
            const isSelected = selectedParticipants.some(p => p.uid === member.uid);
            if (isSelected) {
                setSelectedParticipants(selectedParticipants.filter(p => p.uid !== member.uid));
            } else {
                setSelectedParticipants([...selectedParticipants, member]);
            }
        }
    };

    const isParticipantSelected = (member) => {
        return selectedParticipants.some(p => p.uid === member.uid);
    };

    const handleCreate = () => {
        if (selectedParticipants.length === 0) return;

        if (conversationType === 'group' && !groupName.trim()) {
            alert('Veuillez donner un nom au groupe');
            return;
        }

        onCreate(conversationType, selectedParticipants, groupName);
    };

    const canCreate = () => {
        if (selectedParticipants.length === 0) return false;
        if (conversationType === 'group' && !groupName.trim()) return false;
        return true;
    };

    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Nouvelle Conversation</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Type de conversation */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setConversationType('private');
                                setSelectedParticipants([]);
                                setGroupName('');
                            }}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${conversationType === 'private'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <User className="w-4 h-4 inline mr-2" />
                            Privée
                        </button>
                        <button
                            onClick={() => {
                                setConversationType('group');
                                setSelectedParticipants([]);
                            }}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${conversationType === 'group'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <Users className="w-4 h-4 inline mr-2" />
                            Groupe
                        </button>
                    </div>
                </div>

                {/* Nom du groupe (si groupe) */}
                {conversationType === 'group' && (
                    <div className="p-4 border-b border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nom du groupe
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Équipe Stock, Comptabilité..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                )}

                {/* Recherche de membres */}
                <div className="p-4 border-b border-gray-200">
                    <input
                        type="text"
                        placeholder="Rechercher un membre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Liste des membres */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="text-sm text-gray-600 mb-2">
                        {conversationType === 'private'
                            ? 'Sélectionnez un membre'
                            : `Sélectionnés: ${selectedParticipants.length}`}
                    </div>

                    {filteredMembers.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            Aucun membre trouvé
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredMembers.map(member => {
                                const isSelected = isParticipantSelected(member);
                                const displayName = member.displayName || member.email;

                                return (
                                    <div
                                        key={member.uid}
                                        onClick={() => toggleParticipant(member)}
                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <span className="font-semibold text-gray-700">
                                                        {displayName?.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium">{displayName}</div>
                                                    <div className="text-xs text-gray-500">{member.role}</div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex gap-2">
                    <Button
                        onClick={onClose}
                        variant="secondary"
                        className="flex-1"
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!canCreate()}
                        variant="primary"
                        className="flex-1"
                    >
                        Créer
                    </Button>
                </div>
            </div>
        </div>
    );
}
