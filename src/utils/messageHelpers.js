import { collection, doc, addDoc, getDoc, setDoc, query, where, onSnapshot, serverTimestamp, updateDoc, arrayUnion, increment } from 'firebase/firestore';

/**
 * Parse les tags @utilisateur d'un message
 * @param {string} text - Le texte du message
 * @returns {Array} - Liste des mentions trouvées (ex: ['@john', '@marie'])
 */
export const parseMessageTags = (text) => {
    if (!text) return [];
    const tagRegex = /@(\w+)/g;
    const matches = text.match(tagRegex) || [];
    return matches;
};

/**
 * Génère un ID déterministe pour une conversation privée entre deux utilisateurs
 * @param {string} user1Id 
 * @param {string} user2Id 
 * @returns {string} - ID de conversation (toujours le même pour deux users donnés)
 */
export const getConversationId = (user1Id, user2Id) => {
    // Trier les IDs pour garantir le même résultat quel que soit l'ordre
    const [id1, id2] = [user1Id, user2Id].sort();
    return `private_${id1}_${id2}`;
};

/**
 * Créer ou récupérer une conversation privée
 * @param {Object} db - Instance Firestore
 * @param {string} workspaceId - ID du workspace
 * @param {Object} currentUser - Utilisateur actuel {uid, displayName, email, role}
 * @param {Object} otherUser - Autre utilisateur {uid, displayName, email, role}
 * @returns {Promise<Object>} - La conversation
 */
export const createOrGetPrivateConversation = async (db, workspaceId, currentUser, otherUser) => {
    const conversationId = getConversationId(currentUser.uid, otherUser.uid);
    const conversationRef = doc(db, 'users', workspaceId, 'conversations', conversationId);

    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
        return { id: conversationSnap.id, ...conversationSnap.data() };
    }

    // Créer la conversation
    const newConversation = {
        type: 'private',
        participants: [currentUser.uid, otherUser.uid],
        participantDetails: [
            {
                uid: currentUser.uid,
                displayName: currentUser.displayName || currentUser.email,
                email: currentUser.email,
                role: currentUser.role
            },
            {
                uid: otherUser.uid,
                displayName: otherUser.displayName || otherUser.email,
                email: otherUser.email,
                role: otherUser.role
            }
        ],
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessageText: '',
        unreadCount: {
            [currentUser.uid]: 0,
            [otherUser.uid]: 0
        }
    };

    await setDoc(conversationRef, newConversation);
    return { id: conversationId, ...newConversation };
};

/**
 * Créer une conversation de groupe
 * @param {Object} db - Instance Firestore
 * @param {string} workspaceId - ID du workspace
 * @param {string} groupName - Nom du groupe
 * @param {Array} participants - Liste des participants [{uid, displayName, email, role}, ...]
 * @returns {Promise<Object>} - La conversation créée
 */
export const createGroupConversation = async (db, workspaceId, groupName, participants) => {
    const conversationRef = await addDoc(collection(db, 'users', workspaceId, 'conversations'), {
        type: 'group',
        name: groupName,
        participants: participants.map(p => p.uid),
        participantDetails: participants,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessageText: '',
        unreadCount: participants.reduce((acc, p) => {
            acc[p.uid] = 0;
            return acc;
        }, {})
    });

    const conversationSnap = await getDoc(conversationRef);
    return { id: conversationSnap.id, ...conversationSnap.data() };
};

/**
 * Envoyer un message dans une conversation
 * @param {Object} db - Instance Firestore
 * @param {string} workspaceId - ID du workspace
 * @param {string} conversationId - ID de la conversation
 * @param {Object} sender - Expéditeur {uid, displayName}
 * @param {string} text - Texte du message
 * @param {Object} attachedEntity - Entité attachée (optionnel) {type, id, name}
 * @param {Array} participants - Liste des UIDs des participants
 * @returns {Promise<Object>} - Le message créé
 */
export const sendMessage = async (db, workspaceId, conversationId, sender, text, attachedEntity = null, participants = []) => {
    // Parse les tags
    const tags = parseMessageTags(text);

    // Créer le message
    const messageData = {
        conversationId,
        senderId: sender.uid,
        senderName: sender.displayName || sender.email || 'Utilisateur',
        text,
        taggedUsers: tags,
        attachedEntity,
        createdAt: serverTimestamp(),
        readBy: [sender.uid] // L'expéditeur a déjà lu
    };

    const messageRef = await addDoc(collection(db, 'users', workspaceId, 'messages'), messageData);

    // Mettre à jour la conversation
    const conversationRef = doc(db, 'users', workspaceId, 'conversations', conversationId);

    // Import increment from firestore
    const { increment } = await import('firebase/firestore');

    const updateData = {
        lastMessageAt: serverTimestamp(),
        lastMessageText: text.substring(0, 100) // Preview de 100 caractères
    };

    // Incrémenter unreadCount pour tous sauf l'expéditeur
    participants.forEach(participantId => {
        if (participantId !== sender.uid) {
            updateData[`unreadCount.${participantId}`] = increment(1);
        }
    });

    await updateDoc(conversationRef, updateData);

    // Créer des notifications pour les utilisateurs tagués
    if (tags.length > 0) {
        await notifyTaggedUsers(db, workspaceId, tags, messageRef.id, conversationId, sender, text);
    }

    const messageSnap = await getDoc(messageRef);
    return { id: messageSnap.id, ...messageSnap.data() };
};

/**
 * Marquer un message comme lu
 * @param {Object} db - Instance Firestore
 * @param {string} workspaceId - ID du workspace
 * @param {string} messageId - ID du message
 * @param {string} userId - ID de l'utilisateur qui lit
 */
export const markMessageAsRead = async (db, workspaceId, messageId, userId) => {
    const messageRef = doc(db, 'users', workspaceId, 'messages', messageId);
    await updateDoc(messageRef, {
        readBy: arrayUnion(userId)
    });
};

/**
 * Marquer une conversation comme lue (réinitialiser le compteur non-lus)
 * @param {Object} db - Instance Firestore
 * @param {string} workspaceId - ID du workspace
 * @param {string} conversationId - ID de la conversation
 * @param {string} userId - ID de l'utilisateur
 */
export const markConversationAsRead = async (db, workspaceId, conversationId, userId) => {
    const conversationRef = doc(db, 'users', workspaceId, 'conversations', conversationId);
    await updateDoc(conversationRef, {
        [`unreadCount.${userId}`]: 0
    });
};

/**
 * Notifier les utilisateurs tagués dans un message
 * @param {Object} db - Instance Firestore
 * @param {string} workspaceId - ID du workspace
 * @param {Array} tags - Liste des tags (ex: ['@john', '@marie'])
 * @param {string} messageId - ID du message
 * @param {string} conversationId - ID de la conversation
 * @param {Object} sender - Expéditeur {uid, displayName}
 * @param {string} messageText - Texte du message
 */
const notifyTaggedUsers = async (db, workspaceId, tags, messageId, conversationId, sender, messageText) => {
    // Pour chaque tag, créer une notification
    // Note: Ici on utilise juste le texte du tag, mais dans une vraie implémentation,
    // il faudrait matcher les tags avec les vrais utilisateurs de l'équipe

    // Pour l'instant, on crée juste une notification générique
    // Cette fonction devrait être enrichie avec la vraie logique de mapping @username -> userId

    for (const tag of tags) {
        // TODO: Implémenter le matching @username -> userId via une collection users_profiles
        // Pour l'instant, ce sont juste des notifications "système"
        await addDoc(collection(db, 'users', workspaceId, 'notifications'), {
            type: 'message_tag',
            message: `Vous avez été mentionné par ${sender.displayName || sender.email} : "${messageText.substring(0, 50)}..."`,
            conversationId,
            messageId,
            tag,
            read: false,
            createdAt: serverTimestamp()
        });
    }
};

/**
 * Récupérer les membres de l'équipe (pour autocomplétion)
 * @param {Object} db - Instance Firestore
 * @param {string} workspaceId - ID du workspace
 * @returns {Promise<Array>} - Liste des membres
 */
export const getTeamMembers = async (db, workspaceId) => {
    // On récupère tous les profils qui ont cet ownerId
    const profilesRef = collection(db, 'users_profiles');
    const q = query(profilesRef, where('ownerId', '==', workspaceId));

    return new Promise((resolve, reject) => {
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const members = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
            unsubscribe(); // On ne veut qu'une seule fois
            resolve(members);
        }, reject);
    });
};
