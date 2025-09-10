import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function App() {
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const conversationEndRef = useRef(null);

  const scrollToBottom = () => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setIsLoading(true);

    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setConversation(prev => [...prev, userMessage]);

    try {
      const res = await axios.post('http://localhost:5000/api/recommend', {
        userPrompt: input,
        wantBuyLinks: true
      });

      const payload = res.data || {};
      if (payload && payload.mode === 'recommendation') {
        const aiResponse = {
          role: 'assistant',
          content: payload,
          timestamp: new Date()
        };
        setConversation(prev => [...prev, aiResponse]);
      } else if (payload && payload.mode === 'chat+recommend') {
        const aiResponse = {
          role: 'assistant',
          content: payload,
          timestamp: new Date()
        };
        setConversation(prev => [...prev, aiResponse]);
      } else {
        const message = (typeof payload === 'string') ? payload : (payload?.message || 'Let’s talk books!');
        const aiResponse = {
          role: 'assistant',
          content: { mode: 'chat', message },
          timestamp: new Date()
        };
        setConversation(prev => [...prev, aiResponse]);
      }
      setRecommendations([]);
      setInput('');
    } catch (err) {
      const errorResponse = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-container">
      <div className="container">
        <div className="header-card card">
          <div className="header">
            <h1 className="h-title">Hunter — AI Book Recommendations</h1>
            <p className="h-sub">Tell me your mood, what you loved, or your vibe — I’ll match you with books that feel right.</p>
          </div>
          <div className="input-container">
            <input
              className="input input-field focus-ring"
              type="text"
              placeholder="e.g., I loved Fourth Wing and want more dragon romance, or I'm feeling sad and need something uplifting..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button 
              className="btn primary ask-button"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Thinking…' : 'Ask Hunter'}
            </button>
          </div>
        </div>

        <div className="conversation-container chat-shell">
          {conversation.map((message, index) => (
            <div key={index} className={message.role === 'user' ? 'user' : 'ai'}>
              <div className="message">
                {message.role === 'user' ? (
                  <span>{message.content}</span>
                ) : (
                  <div>
                    {message.content?.mode === 'recommendation' ? (
                      <div className="col" style={{ gap: 12 }}>
                        <span className="badge accent">📚 Recommendations</span>
                        {(message.content.books || []).map((b, i) => (
                          <div key={i} className="book card">
                            <h3 className="book-title">{b.title}</h3>
                            <p><strong>Author:</strong> {b.author}</p>
                            {b.genre && <p><strong>Genre:</strong> {b.genre}</p>}
                            {b.description && <p>{b.description}</p>}
                          </div>
                        ))}
                      </div>
                    ) : message.content?.mode === 'chat+recommend' ? (
                      <div className="col" style={{ gap: 12 }}>
                        {(message.content.parts || []).map((part, i) => (
                          part.type === 'recommendation' ? (
                            <div key={i} className="book card">
                              <h3 className="book-title">{part.book?.title}</h3>
                              {part.book?.author && <p><strong>Author:</strong> {part.book.author}</p>}
                              {part.book?.genre && <p><strong>Genre:</strong> {part.book.genre}</p>}
                              {part.book?.description && <p>{part.book.description}</p>}
                            </div>
                          ) : (
                            <div key={i} className="recommendations-text"><span>{part.message}</span></div>
                          )
                        ))}
                      </div>
                    ) : (
                      <div className="recommendations-text">
                        <span>{message.content?.message || ''}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={conversationEndRef} />
        </div>

        {isLoading && (
          <div className="helper loading-dots">Thinking the perfect books for you</div>
        )}
      </div>
    </div>
  );
}

export default App;
