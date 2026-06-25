const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');

const getConversations = async (req, res) => {
  const userId = req.user._id;
  const role   = req.user.role;

  let filter;
  if      (role === 'industry_supervisor')    filter = { industrySupervisor: userId };
  else if (role === 'institution_supervisor') filter = { institutionSupervisor: userId };
  else                                        filter = { student: userId };

  const conversations = await Conversation.find(filter)
    .populate('student',               'firstName lastName profileImage')
    .populate('industrySupervisor',    'firstName lastName')
    .populate('institutionSupervisor', 'firstName lastName')
    .sort({ lastMessageAt: -1 })
    .lean();

  return res.json({ success: true, data: { conversations } });
};

const getMessages = async (req, res) => {
  const userId              = req.user._id;
  const { conversationId }  = req.params;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

  const isParticipant =
    conversation.industrySupervisor.toString()    === userId.toString() ||
    conversation.institutionSupervisor.toString() === userId.toString() ||
    conversation.student.toString()               === userId.toString();

  if (!isParticipant) return res.status(403).json({ success: false, message: 'Access denied' });

  const [messages] = await Promise.all([
    Message.find({ conversation: conversationId })
      .populate('sender', 'firstName lastName profileImage')
      .sort({ createdAt: 1 })
      .lean(),
    Message.updateMany(
      { conversation: conversationId, sender: { $ne: userId }, isRead: false },
      { isRead: true, readAt: new Date() }
    ),
  ]);

  return res.json({ success: true, data: { messages, conversation } });
};

const sendMessage = async (req, res) => {
  const userId             = req.user._id;
  const role               = req.user.role;
  const { conversationId } = req.params;
  const { body }           = req.body;

  if (!body?.trim()) return res.status(400).json({ success: false, message: 'Message body is required' });

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

  const isParticipant =
    conversation.industrySupervisor.toString()    === userId.toString() ||
    conversation.institutionSupervisor.toString() === userId.toString() ||
    conversation.student.toString()               === userId.toString();

  if (!isParticipant) return res.status(403).json({ success: false, message: 'Access denied' });

  let senderRole;
  if      (role === 'industry_supervisor')    senderRole = 'industry_supervisor';
  else if (role === 'institution_supervisor') senderRole = 'institution_supervisor';
  else                                        senderRole = 'student';

  const message = await Message.create({
    conversation: conversationId,
    sender:       userId,
    senderRole,
    body:         body.trim(),
  });

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage:   body.trim().slice(0, 100),
    lastMessageAt: new Date(),
  });

  const populated = await Message.findById(message._id)
    .populate('sender', 'firstName lastName profileImage')
    .lean();

  return res.status(201).json({ success: true, data: { message: populated } });
};

module.exports = { getConversations, getMessages, sendMessage };
