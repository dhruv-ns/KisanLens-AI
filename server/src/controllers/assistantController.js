const { agriculturalChat } = require('../services/gnaniService');
const AssistantConversation = require('../models/AssistantConversation');
const { isDBConnected } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/assistant/message
 * Handles agricultural chat messages using Gnani AI (Evon v3.3)
 */
async function sendMessage(req, res, next) {
  try {
    const { message, sessionId, context } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required.' });
    }

    const sid = sessionId || uuidv4();

    // Get conversation history if DB available
    let history = [];
    if (isDBConnected()) {
      try {
        const conversation = await AssistantConversation.findOne({ sessionId: sid }).maxTimeMS(5000);
        history = conversation?.messages?.map((m) => ({ role: m.role, content: m.content })) || [];
      } catch { /* ignore */ }
    }

    // Get AI response via Gnani AI (Evon v3.3)
    const response = await agriculturalChat(message.trim(), context || {}, history);

    // Save conversation if DB is available
    if (isDBConnected()) {
      try {
        let conversation = await AssistantConversation.findOne({ sessionId: sid }).maxTimeMS(5000);
        if (!conversation) {
          conversation = new AssistantConversation({
            userId: req.userId || null,
            sessionId: sid,
            messages: [],
          });
        }
        conversation.messages.push(
          { role: 'user', content: message.trim() },
          { role: 'assistant', content: response }
        );
        if (conversation.messages.length > 50) {
          conversation.messages = conversation.messages.slice(-50);
        }
        await conversation.save();
      } catch { /* ignore DB save failure */ }
    }

    res.json({
      success: true,
      data: {
        sessionId: sid,
        response,
        provider: 'Gnani AI (Evon v3.3)',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/assistant/history
 */
async function clearHistory(req, res, next) {
  try {
    const { sessionId } = req.body;
    if (sessionId && isDBConnected()) {
      try {
        await AssistantConversation.deleteOne({ sessionId });
      } catch { /* ignore */ }
    }
    res.json({ success: true, message: 'Conversation cleared.' });
  } catch (error) {
    next(error);
  }
}

module.exports = { sendMessage, clearHistory };
