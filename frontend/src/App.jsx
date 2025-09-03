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

      const aiResponse = {
        role: 'assistant',
        content: res.data.recommendations || [],
        timestamp: new Date()
      };

      setConversation(prev => [...prev, aiResponse]);
      setRecommendations(res.data.recommendations || []);
      setInput('');
    } catch (err) {
      const errorResponse = {
        role: 'assistant',
        content: [{ title: 'Error', author: 'System', genre: 'Error', reason: 'Sorry, I encountered an error. Please try again.' }],
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
                    <span className="badge accent">🤖 Hunter's Recommendations</span>
                    {Array.isArray(message.content) && message.content.length > 0 ? (
                      <div className="col" style={{ gap: 12 }}>
                        {message.content.map((book, bookIndex) => (
                          <div key={bookIndex} className="book">
                            <h3>{book.title}</h3>
                            <p><strong>Author:</strong> {book.author}</p>
                            {book.genre && <p><strong>Genre:</strong> {book.genre}</p>}
                            {book.reason && (
                              <p className="why">
                                <strong>Why it fits:</strong> {book.reason}
                              </p>
                            )}
                            {book.summary && (
                              <p>
                                <strong>Summary:</strong> {book.summary}
                              </p>
                            )}
                            {book.buyLinks && book.buyLinks.length > 0 && (
                              <div className="row" style={{ flexWrap: 'wrap' }}>
                                {book.buyLinks.map((link, linkIndex) => (
                                  <a
                                    key={linkIndex}
                                    className="btn"
                                    href={link.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    🛒 Buy on {link.marketplace}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mono">{typeof message.content === 'string' ? message.content : 'No recommendations available.'}</p>
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
