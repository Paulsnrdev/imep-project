import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { formatTime, timeAgo } from '../../utils/formatDate';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';

const MessagesPage = () => {
  const { conversationId } = useParams();
  const navigate           = useNavigate();
  const { user }           = useAuth();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages]           = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [body, setBody]                   = useState('');
  const [sending, setSending]             = useState(false);
  const bottomRef                         = useRef(null);

  useEffect(() => {
    api.get('/messages/conversations')
      .then(({ data }) => {
        const convs = data.data.conversations;
        setConversations(convs);
        // Auto-open the only conversation if none selected
        if (!conversationId && convs.length === 1) {
          navigate(`/student/messages/${convs[0]._id}`, { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, []);

  useEffect(() => {
    if (!conversationId) { setMessages([]); setActiveConv(null); return; }
    setLoadingMsgs(true);
    api.get(`/messages/${conversationId}`)
      .then(({ data }) => { setMessages(data.data.messages); setActiveConv(data.data.conversation); })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!body.trim() || !conversationId) return;
    setSending(true);
    try {
      const { data } = await api.post(`/messages/${conversationId}`, { body });
      setMessages((prev) => [...prev, data.data.message]);
      setBody('');
      setConversations((prev) =>
        prev.map((c) => c._id === conversationId ? { ...c, lastMessage: body.trim(), lastMessageAt: new Date().toISOString() } : c)
      );
    } catch { } finally { setSending(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const getConvTitle = (conv) => {
    const sup = conv.institutionSupervisor;
    return sup ? `${sup.firstName} ${sup.lastName}` : 'Institution Supervisor';
  };

  return (
    <div className="flex gap-0 h-[calc(100vh-8rem)] pb-20 lg:pb-0" style={{ minHeight: 0 }}>

      {/* Sidebar — hidden on mobile when a conversation is open */}
      <div className={`${conversationId ? 'hidden lg:flex' : 'flex'} w-full md:w-80 shrink-0 border-r border-gray-100 flex-col bg-white rounded-l-xl overflow-hidden`}>
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Messages</h2>
          <p className="text-xs text-gray-400 mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : conversations.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No conversations yet" description="A message thread will appear here once your internship is assigned by your institution supervisor." />
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv._id === conversationId;
              const isUnread = (conv.unreadCount?.student ?? 0) > 0;
              return (
                <button
                  key={conv._id}
                  onClick={() => navigate(`/student/messages/${conv._id}`)}
                  className={`w-full text-left p-4 border-b border-gray-50 transition-colors hover:bg-gray-50 ${isActive ? 'bg-green-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={getConvTitle(conv)} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {getConvTitle(conv)}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0">{conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : ''}</span>
                      </div>
                      <p className="text-xs text-gray-400">Institution Supervisor</p>
                      <p className={`text-xs mt-0.5 truncate ${isUnread ? 'text-gray-700' : 'text-gray-400'}`}>
                        {conv.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                    {isUnread && <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 flex flex-col bg-white rounded-r-xl overflow-hidden ${conversationId ? '' : 'hidden lg:flex'}`}>
        {!conversationId ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState title="Select a conversation" description="Choose a conversation from the list to start messaging." />
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <button
                onClick={() => navigate('/student/messages')}
                className="lg:hidden text-sm text-blue-600 shrink-0 mr-1"
              >
                ← Back
              </button>
              {activeConv && (
                <>
                  <Avatar name={getConvTitle(activeConv)} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{getConvTitle(activeConv)}</p>
                    <p className="text-xs text-gray-400">Institution Supervisor</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender?._id === user?._id;
                  return (
                    <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && <Avatar name={msg.sender?.firstName ?? '?'} size="sm" className="mr-2 mt-1 shrink-0" />}
                      <div className={`max-w-xs sm:max-w-md flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                        {!isMine && <p className="text-xs text-gray-400 px-1">{msg.sender?.firstName} {msg.sender?.lastName}</p>}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMine ? 'bg-green-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                          {msg.body}
                        </div>
                        <p className="text-xs text-gray-300 px-1">{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Type a message... (Enter to send)"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-green-500"
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !body.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 shrink-0"
              >
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
