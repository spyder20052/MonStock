import React, { useState, useEffect, useMemo } from 'react';
import { MessageCircle, Send, Users, Plus, Search, X, Paperclip, ChevronLeft } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    createOrGetPrivateConversation,
    createGroupConversation,
    sendMessage,
    markConversationAsRead,
    getTeamMembers
} from '../../utils/messageHelpers';
import { formatDate } from '../../utils/helpers';
import Button from '../../components/ui/Button';
import CreateConversationModal from '../../components/modals/CreateConversationModal';

export default function MessagesView({ user, userProfile, currentWorkspaceId }) {
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Charger les membres de l'équipe
    useEffect(() => {
        if (!currentWorkspaceId) return;

        getTeamMembers(db, currentWorkspaceId)
            .then(members => setTeamMembers(members))
            .catch(err => console.error('Erreur chargement équipe:', err));
    }, [currentWorkspaceId]);

    // Écouter les conversations
    useEffect(() => {
        if (!user || !currentWorkspaceId) return;

        const q = query(
            collection(db, 'users', currentWorkspaceId, 'conversations'),
            where('participants', 'array-contains', user.uid),
            orderBy('lastMessageAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setConversations(convs);
            setLoading(false);
        }, (error) => {
            console.error('Erreur conversations:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, currentWorkspaceId]);

    // Créer une liste combinée de conversations existantes + membres de l'équipe
    const combinedConversations = useMemo(() => {
        const existingConvs = conversations.map(conv => ({
            ...conv,
            isExisting: true
        }));

        // Créer des "conversations potentielles" pour chaque membre qui n'a pas encore de conversation
        const potentialConvs = teamMembers
            .filter(member => member.uid !== user.uid) // Exclure soi-même
            .filter(member => {
                // Vérifier si une conversation privée existe déjà avec ce membre
                return !conversations.some(conv =>
                    conv.type === 'private' &&
                    conv.participants.includes(member.uid)
                );
            })
            .map(member => ({
                id: `potential_${member.uid}`,
                type: 'private',
                isPotential: true,
                participants: [user.uid, member.uid],
                participantDetails: [
                    {
                        uid: user.uid,
                        displayName: user.displayName || userProfile?.email,
                        email: userProfile?.email,
                        role: userProfile?.role
                    },
                    member
                ],
                lastMessageText: 'Commencer une conversation...',
                unreadCount: { [user.uid]: 0 }
            }));

        return [...existingConvs, ...potentialConvs].sort((a, b) => {
            // Les conversations existantes avec des messages récents viennent en premier
            if (a.isExisting && !b.isExisting) return -1;
            if (!a.isExisting && b.isExisting) return 1;

            // Trier par date pour les conversations existantes
            if (a.lastMessageAt && b.lastMessageAt) {
                return b.lastMessageAt.toMillis() - a.lastMessageAt.toMillis();
            }

            return 0;
        });
    }, [conversations, teamMembers, user, userProfile]);

    // Écouter les messages de la conversation sélectionnée
    useEffect(() => {
        if (!selectedConversation || !currentWorkspaceId || selectedConversation.isPotential) {
            setMessages([]);
            return;
        }

        const q = query(
            collection(db, 'users', currentWorkspaceId, 'messages'),
            where('conversationId', '==', selectedConversation.id),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);

            // Marquer comme lu
            if (msgs.length > 0) {
                markConversationAsRead(db, currentWorkspaceId, selectedConversation.id, user.uid);
            }
        });

        return () => unsubscribe();
    }, [selectedConversation, currentWorkspaceId, user]);

    const handleSelectConversation = async (conversation) => {
        // Si c'est une conversation potentielle, la créer d'abord
        if (conversation.isPotential) {
            const otherMember = conversation.participantDetails.find(p => p.uid !== user.uid);
            const newConv = await createOrGetPrivateConversation(
                db,
                currentWorkspaceId,
                {
                    uid: user.uid,
                    displayName: user.displayName || userProfile?.email,
                    email: userProfile?.email,
                    role: userProfile?.role
                },
                otherMember
            );
            setSelectedConversation({ ...newConv, isExisting: true });
        } else {
            setSelectedConversation(conversation);
        }
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() || !selectedConversation) return;

        // Si c'est une conversation potentielle, la créer d'abord
        let convToUse = selectedConversation;
        if (selectedConversation.isPotential) {
            const otherMember = selectedConversation.participantDetails.find(p => p.uid !== user.uid);
            convToUse = await createOrGetPrivateConversation(
                db,
                currentWorkspaceId,
                {
                    uid: user.uid,
                    displayName: user.displayName || userProfile?.email,
                    email: userProfile?.email,
                    role: userProfile?.role
                },
                otherMember
            );
            setSelectedConversation({ ...convToUse, isExisting: true });
        }

        try {
            await sendMessage(
                db,
                currentWorkspaceId,
                convToUse.id,
                {
                    uid: user.uid,
                    displayName: user.displayName || userProfile?.email,
                    email: userProfile?.email
                },
                messageText,
                null, // attachedEntity (à implémenter plus tard)
                convToUse.participants
            );

            setMessageText('');
        } catch (error) {
            console.error('Erreur envoi message:', error);
        }
    };

    const handleCreateGroupConversation = async (type, participants, groupName = '') => {
        try {
            const allParticipants = [
                {
                    uid: user.uid,
                    displayName: user.displayName || userProfile?.email,
                    email: userProfile?.email,
                    role: userProfile?.role
                },
                ...participants
            ];
            const newConversation = await createGroupConversation(
                db,
                currentWorkspaceId,
                groupName,
                allParticipants
            );

            setSelectedConversation(newConversation);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Erreur création conversation:', error);
        }
    };

    const filteredConversations = useMemo(() => {
        if (!searchTerm) return combinedConversations;

        return combinedConversations.filter(conv => {
            if (conv.type === 'group') {
                return conv.name?.toLowerCase().includes(searchTerm.toLowerCase());
            } else {
                // Recherche dans les noms des participants
                return conv.participantDetails?.some(p =>
                    p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
        });
    }, [combinedConversations, searchTerm]);

    const getConversationName = (conversation) => {
        if (conversation.type === 'group') {
            return conversation.name || 'Groupe sans nom';
        }

        // Conversation privée : afficher le nom de l'autre participant
        const otherParticipant = conversation.participantDetails?.find(p => p.uid !== user.uid);
        return otherParticipant?.displayName || otherParticipant?.email || 'Utilisateur';
    };

    const getUnreadCount = (conversation) => {
        return conversation.unreadCount?.[user.uid] || 0;
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-gray-500">Chargement des conversations...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex bg-gray-50">
            {/* Liste des conversations - Sidebar */}
            <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-white border-r border-gray-200 flex-col`}>
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <MessageCircle className="w-6 h-6" />
                            Messages
                        </h2>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            variant="primary"
                            size="sm"
                            title="Créer un groupe"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Liste des conversations */}
                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Aucun membre disponible</p>
                        </div>
                    ) : (
                        filteredConversations.map(conversation => {
                            const unread = getUnreadCount(conversation);
                            const isSelected = selectedConversation?.id === conversation.id;

                            return (
                                <div
                                    key={conversation.id}
                                    onClick={() => handleSelectConversation(conversation)}
                                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {conversation.type === 'group' ? (
                                                    <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-sm font-semibold text-blue-600">
                                                            {getConversationName(conversation).charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <h3 className="font-semibold text-sm truncate">
                                                    {getConversationName(conversation)}
                                                </h3>
                                                {conversation.isPotential && (
                                                    <span className="text-xs text-gray-400 ml-auto">Nouveau</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">
                                                {conversation.lastMessageText || 'Aucun message'}
                                            </p>
                                        </div>

                                        {unread > 0 && (
                                            <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                                                {unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Zone de messages */}
            <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white`}>
                {selectedConversation ? (
                    <>
                        {/* Header conversation */}
                        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                            <button
                                onClick={() => setSelectedConversation(null)}
                                className="md:hidden text-gray-600 hover:text-gray-900"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            {selectedConversation.type === 'group' ? (
                                <Users className="w-5 h-5 text-gray-500" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="font-semibold text-blue-600">
                                        {getConversationName(selectedConversation).charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}

                            <div className="flex-1">
                                <h2 className="font-bold">{getConversationName(selectedConversation)}</h2>
                                <p className="text-xs text-gray-500">
                                    {selectedConversation.type === 'group'
                                        ? `${selectedConversation.participants?.length || 0} membres`
                                        : selectedConversation.isPotential ? 'Nouvelle conversation' : 'Conversation privée'}
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.length === 0 && selectedConversation.isPotential && (
                                <div className="text-center text-gray-400 mt-10">
                                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>Commencez la conversation en envoyant un message</p>
                                </div>
                            )}
                            {messages.map((message) => {
                                const isOwn = message.senderId === user.uid;
                                const messageDate = message.createdAt?.toDate ? message.createdAt.toDate() : new Date();

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[70%] ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg p-3`}>
                                            {!isOwn && (
                                                <div className="text-xs font-semibold mb-1 opacity-75">
                                                    {message.senderName}
                                                </div>
                                            )}
                                            <div className="text-sm whitespace-pre-wrap break-words">
                                                {message.text}
                                            </div>
                                            {message.attachedEntity && (
                                                <div className={`mt-2 text-xs p-2 rounded ${isOwn ? 'bg-blue-700' : 'bg-gray-200'}`}>
                                                    📎 {message.attachedEntity.type}: {message.attachedEntity.name}
                                                </div>
                                            )}
                                            <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                                                {formatDate(messageDate)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input message */}
                        <div className="p-4 border-t border-gray-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Tapez votre message... (utilisez @ pour mentionner)"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!messageText.trim()}
                                    variant="primary"
                                >
                                    <Send className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">Sélectionnez une conversation</p>
                            <p className="text-sm mt-2">ou créez un groupe</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal création conversation (groupes uniquement) */}
            {showCreateModal && (
                <CreateConversationModal
                    teamMembers={teamMembers.filter(m => m.uid !== user.uid)}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateGroupConversation}
                    groupOnly={true}
                />
            )}
        </div>
    );
}
