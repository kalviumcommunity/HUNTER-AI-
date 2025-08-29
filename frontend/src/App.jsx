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
    
    // Add user message to conversation
    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setConversation(prev => [...prev, userMessage]);
    
    try {
      const res = await axios.post('http://localhost:5000/api/recommend', {
        userPrompt: input,
        mood: '', // You can add mood input later
        personality: '', // You can add personality input later
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
      console.error(err);
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
    <div className="chat-container" style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px'
      }}>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          color: '#1a1a1a',
          fontSize: '28px',
          fontWeight: '700'
        }}>
          📚 Hunter - AI Book Recommendations
        </h1>
        <p style={{ 
          color: '#666', 
          margin: '0 0 20px 0',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          Tell me what you're in the mood for, what you've enjoyed reading, or describe your personality. I'll recommend perfect books just for you!
        </p>
        
        <div className="input-container" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            className="input-field"
            type="text"
            placeholder="e.g., I loved Fourth Wing and want more dragon romance, or I'm feeling sad and need something uplifting..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{ 
              flex: 1,
              padding: '12px 16px', 
              border: '2px solid #e1e5e9',
              borderRadius: '12px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
          <button 
            className="ask-button"
            onClick={handleSubmit} 
            disabled={isLoading}
            style={{ 
              padding: '12px 24px',
              backgroundColor: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {isLoading ? 'Thinking...' : 'Ask Hunter'}
          </button>
        </div>
      </div>

      {/* Conversation Display */}
      <div className="conversation-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {conversation.map((message, index) => (
          <div key={index} style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            border: message.role === 'user' ? '2px solid #e3f2fd' : '2px solid #f3e5f5'
          }}>
            {message.role === 'user' ? (
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  backgroundColor: '#e3f2fd',
                  color: '#1565c0',
                  padding: '12px 16px',
                  borderRadius: '18px',
                  display: 'inline-block',
                  maxWidth: '80%',
                  textAlign: 'left'
                }}>
                  {message.content}
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  backgroundColor: '#f3e5f5',
                  color: '#7b1fa2',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  marginBottom: '16px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  🤖 Hunter's Recommendations
                </div>
                
                {Array.isArray(message.content) && message.content.length > 0 ? (
                  <div>
                    {message.content.map((book, bookIndex) => (
                      <div key={bookIndex} className="book-card" style={{
                        border: '1px solid #e1e5e9',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '16px',
                        backgroundColor: '#fafbfc',
                        transition: 'all 0.2s ease'
                      }}>
                        <h3 className="book-title" style={{
                          margin: '0 0 8px 0',
                          color: '#1a1a1a',
                          fontSize: '20px',
                          fontWeight: '700'
                        }}>
                          {book.title}
                        </h3>
                        <p style={{
                          margin: '0 0 8px 0',
                          color: '#666',
                          fontSize: '16px'
                        }}>
                          <strong>Author:</strong> {book.author}
                        </p>
                        {book.genre && (
                          <p style={{
                            margin: '0 0 12px 0',
                            color: '#666',
                            fontSize: '16px'
                          }}>
                            <strong>Genre:</strong> {book.genre}
                          </p>
                        )}
                        {book.reason && (
                          <p style={{
                            margin: '0 0 12px 0',
                            color: '#333',
                            fontSize: '16px',
                            lineHeight: '1.6',
                            fontStyle: 'italic',
                            backgroundColor: '#f8f9fa',
                            padding: '12px',
                            borderRadius: '8px',
                            borderLeft: '4px solid #007bff'
                          }}>
                            💡 <strong>Why this book is perfect for you:</strong><br/>
                            {book.reason}
                          </p>
                        )}
                        {book.summary && (
                          <p style={{
                            margin: '0 0 12px 0',
                            color: '#555',
                            fontSize: '15px',
                            lineHeight: '1.6'
                          }}>
                            📖 <strong>Plot Summary:</strong> {book.summary}
                          </p>
                        )}
                        {book.buyLinks && book.buyLinks.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {book.buyLinks.map((link, linkIndex) => (
                              <a
                                key={linkIndex}
                                className="buy-link-tag"
                                href={link.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  padding: '6px 12px',
                                  borderRadius: '16px',
                                  textDecoration: 'none',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  transition: 'all 0.2s'
                                }}
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
                  <p style={{ color: '#666', margin: 0 }}>
                    {typeof message.content === 'string' ? message.content : 'No recommendations available.'}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={conversationEndRef} />
      </div>

      {isLoading && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}>
          <div className="loading-dots" style={{ color: '#666' }}>
            🤔 Hunter is thinking of the perfect books for you
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
